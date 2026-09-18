import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Asset, Balance, DexTransaction, LockedBalance, Order, TradeHistoryEntry, Transaction, Wallet } from '@/types';
import { walletService } from '@/services/walletService';
import { transactionService } from '@/services/transactionService';
import { swapService } from '@/services/swapService';
import { marketService } from '@/services/marketService';
import { cexTradingService } from '@/services/cexTradingService';
import { submitServerOrder } from '@/services/tradingOrderService';
import { dexTradingService } from '@/services/dexTradingService';
import { fetchBalancesFromDb } from '@/services/dbSyncService';
import type { PortfolioSummary } from '@/types';

interface AppContextValue {
  wallet: Wallet;
  assets: Asset[];
  balances: Balance[];
  transactions: Transaction[];
  portfolio: PortfolioSummary;
  marketDataReady: boolean;
  openOrders: Order[];
  orderHistory: Order[];
  tradeHistory: TradeHistoryEntry[];
  realizedPnl: number;
  unrealizedPnl: number;
  lockedBalances: LockedBalance[];
  dexTransactions: DexTransaction[];
  refresh: () => void;
  sendTransaction: (params: {
    assetId: string; assetSymbol: string; networkId: string;
    amount: number; recipient: string; fee: number;
  }) => Transaction;
  executeSwap: (fromAssetId: string, toAssetId: string, fromAmount: number) => boolean;
  placeMarketOrder: (pairSymbol: string, side: 'buy' | 'sell', amount: number) => Order;
  placeLimitOrder: (pairSymbol: string, side: 'buy' | 'sell', amount: number, price: number) => Order;
  submitServerOrder: (pairSymbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', amount: number, price?: number) => Promise<Order>;
  cancelOrder: (orderId: string) => boolean;
  executeDexSwap: (fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number) => DexTransaction | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<Wallet>(() => walletService.getWallet());
  const [assets] = useState<Asset[]>(() => walletService.getAssets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => transactionService.getTransactions());
  const [tick, setTick] = useState(0);
  const [marketDataReady, setMarketDataReady] = useState(false);

  const refresh = useCallback(() => {
    setWallet(walletService.getWallet());
    setTransactions(transactionService.getTransactions());
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMarketDataReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(transactionService.getTransactions());
      const filled = cexTradingService.checkLimitOrders();
      if (filled.filled > 0) setTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const walletBalancesRef = useRef(wallet.balances);
  walletBalancesRef.current = wallet.balances;
  useEffect(() => {
    const poll = async () => {
      const dbBalances = await fetchBalancesFromDb();
      if (!dbBalances) return;
      let changed = false;
      for (const b of walletBalancesRef.current) {
        const dbAmount = dbBalances.get(b.assetId);
        if (dbAmount !== undefined && Math.abs(dbAmount - b.amount) > 0.00000001) {
          walletService.setBalance(b.assetId, dbAmount);
          changed = true;
        }
      }
      if (changed) refresh();
    };
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const sendTransaction = useCallback((params: {
    assetId: string; assetSymbol: string; networkId: string;
    amount: number; recipient: string; fee: number;
  }) => {
    const tx = transactionService.sendTransaction(params);
    refresh();
    return tx;
  }, [refresh]);

  const executeSwap = useCallback((fromAssetId: string, toAssetId: string, fromAmount: number) => {
    const quote = swapService.getQuote(fromAssetId as never, toAssetId as never, fromAmount);
    if (!quote) return false;
    const balance = walletService.getBalance(fromAssetId);
    if (!balance || balance.amount < fromAmount + quote.networkFee) return false;
    transactionService.addSwapTransaction({
      fromAssetId, toAssetId, fromAmount, toAmount: quote.toAmount, fee: quote.networkFee,
    });
    refresh();
    return true;
  }, [refresh]);

  const placeMarketOrder = useCallback((pairSymbol: string, side: 'buy' | 'sell', amount: number) => {
    const order = cexTradingService.placeMarketOrder(pairSymbol, side, amount);
    refresh();
    return order;
  }, [refresh]);

  const placeLimitOrder = useCallback((pairSymbol: string, side: 'buy' | 'sell', amount: number, price: number) => {
    const order = cexTradingService.placeLimitOrder(pairSymbol, side, amount, price);
    refresh();
    return order;
  }, [refresh]);

  const submitServerTradingOrder = useCallback(async (pairSymbol: string, side: 'buy' | 'sell', type: 'market' | 'limit', amount: number, price?: number) => {
    const order = await submitServerOrder({ pairSymbol, side, type, amount, price });
    refresh();
    return order;
  }, [refresh]);

  const cancelOrder = useCallback((orderId: string) => {
    const result = cexTradingService.cancelOrder(orderId);
    if (result) refresh();
    return result;
  }, [refresh]);

  const executeDexSwap = useCallback((fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number) => {
    const result = dexTradingService.executeSwap(fromAssetId as never, toAssetId as never, fromAmount, slippage);
    if (result) refresh();
    return result;
  }, [refresh]);

  const balances = useMemo(() => wallet.balances, [wallet, tick]);
  const portfolio = useMemo(() => marketService.getPortfolioSummary(wallet.balances), [wallet, tick]);
  const realizedPnl = useMemo(() => cexTradingService.getTotalRealizedPnl(), [tick]);
  const unrealizedPnl = useMemo(() => cexTradingService.getTotalUnrealizedPnl(), [tick]);
  const openOrders = useMemo(() => cexTradingService.getOpenOrders(), [tick]);
  const orderHistory = useMemo(() => cexTradingService.getOrderHistory(), [tick]);
  const tradeHistory = useMemo(() => cexTradingService.getTradeHistory(), [tick]);
  const lockedBalances = useMemo(() => cexTradingService.getLockedBalances(), [tick]);
  const dexTransactions = useMemo(() => dexTradingService.getTransactionHistory(), [tick]);

  const value: AppContextValue = {
    wallet, assets, balances, transactions, portfolio, marketDataReady,
    openOrders, orderHistory, tradeHistory, realizedPnl, unrealizedPnl,
    lockedBalances, dexTransactions, refresh, sendTransaction, executeSwap,
    placeMarketOrder, placeLimitOrder, submitServerOrder: submitServerTradingOrder, cancelOrder, executeDexSwap,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
