/**
 * Service layer interfaces.
 * Defines contracts for wallet, balance, transaction, market data, swap, trading and order services.
 */

import type { Asset, Balance, Candlestick, Network, Order, OrderBook, SwapQuote, Transaction, TradingPair, Wallet } from '@/types';

export type WalletConnectionType = 'demo' | 'ton-connect' | 'imported';

export interface WalletProvider {
  readonly type: WalletConnectionType;
  readonly isDemo: boolean;
  createWallet(): Promise<Wallet>;
  importWallet(mnemonic: string): Promise<Wallet>;
  connectExternal(): Promise<Wallet>;
  getWallet(): Wallet | null;
  isImportSupported(): boolean;
}

export type BalanceStatus = 'fresh' | 'stale' | 'refreshing' | 'unavailable';

export interface BalanceResult {
  balances: Balance[];
  status: BalanceStatus;
  lastUpdated: number;
  error?: string;
}

export interface BalanceService {
  getBalances(address: string): Promise<BalanceResult>;
  getBalance(address: string, assetId: string): Promise<Balance | null>;
}

export interface TransactionService {
  getTransactions(address: string): Promise<Transaction[]>;
  getTransaction(txId: string): Promise<Transaction | null>;
  prepareSend(params: SendParams): TransactionDraft;
  submitTransaction(draft: TransactionDraft): Promise<Transaction>;
}

export interface SendParams {
  assetId: string; assetSymbol: string; networkId: string;
  amount: number; recipient: string; fee: number;
}

export interface TransactionDraft {
  assetId: string; assetSymbol: string; networkId: string;
  amount: number; recipient: string; fee: number; total: number;
  state: 'validated' | 'awaiting_confirmation';
  warnings: string[];
}

export type MarketDataStatus = 'live' | 'stale' | 'unavailable' | 'demo';

export interface MarketDataResult {
  assets: Asset[]; status: MarketDataStatus; lastUpdated: number; source: string; error?: string;
}

export interface MarketDataService {
  getMarketData(): Promise<MarketDataResult>;
  getAssetPrice(assetId: string): Promise<number | null>;
  getTradingPairs(): TradingPair[];
  getPair(symbol: string): TradingPair | undefined;
  getCandlesticks(symbol: string, interval: string, limit: number): Candlestick[];
  getOrderBook(symbol: string): OrderBook;
}

export interface SwapQuoteService {
  getQuote(fromAssetId: string, toAssetId: string, fromAmount: number): SwapQuote | null;
  getSupportedPairs(): { from: string; to: string }[];
}

export interface SwapExecutionService {
  execute(fromAssetId: string, toAssetId: string, fromAmount: number): Promise<boolean>;
  isLive(): boolean;
}

export interface TradingService {
  placeMarketOrder(pairSymbol: string, side: 'buy' | 'sell', amount: number): Order;
  placeLimitOrder(pairSymbol: string, side: 'buy' | 'sell', amount: number, price: number): Order;
  cancelOrder(orderId: string): boolean;
  getOpenOrders(): Order[];
  getOrderHistory(): Order[];
  getTradeFee(pairSymbol: string, side: 'buy' | 'sell', amount: number): number;
}

export interface OrderService {
  getOrders(): Order[];
  getOpenOrders(): Order[];
  getOrderHistory(): Order[];
  getOrder(id: string): Order | undefined;
  cancelOrder(id: string): boolean;
}

export interface NetworkService {
  getNetworks(): Network[];
  getNetwork(id: string): Network | undefined;
  isNetworkLive(networkId: string): boolean;
}

export interface CEXTradingService {
  placeMarketOrder(pairSymbol: string, side: 'buy' | 'sell', amount: number): Order;
  placeLimitOrder(pairSymbol: string, side: 'buy' | 'sell', amount: number, price: number): Order;
  cancelOrder(orderId: string): boolean;
  getOpenOrders(): Order[];
  getOrderHistory(): Order[];
  getTradeHistory(): import('@/types').TradeHistoryEntry[];
  getTradeFee(pairSymbol: string, side: 'buy' | 'sell', amount: number): number;
  getTotalRealizedPnl(): number;
  getTotalUnrealizedPnl(): number;
  getLockedBalances(): import('@/types').LockedBalance[];
  getAvailableBalance(assetId: string): number;
}

export interface DEXTradingService {
  getQuote(fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number): import('@/types').DexQuote | null;
  prepareSwap(fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number): import('@/types').DexTransaction | null;
  executeSwap(fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number): import('@/types').DexTransaction | null;
  getTransactionHistory(): import('@/types').DexTransaction[];
  getLiquidityForPair(fromAssetId: string, toAssetId: string): number;
  getRoute(fromAssetId: string, toAssetId: string): import('@/types').DexRoute;
  getAllPools(): import('@/types').LiquidityPool[];
  getTotalLiquidity(): number;
}

export interface BSCService {
  getChainId(): number; getRpcUrl(): string; getNetworkId(): string;
  getNativeAsset(): string; getSupportedTokens(): string[];
  isTokenSupported(assetId: string): boolean;
  getGasEstimate(fromAssetId: string, toAssetId: string): number;
  getDemoAddress(): string; isLive(): boolean;
}

export interface LiquidityService {
  findPool(tokenA: string, tokenB: string): import('@/types').LiquidityPool | undefined;
  getAllPools(): import('@/types').LiquidityPool[];
  getPoolsForToken(assetId: string): import('@/types').LiquidityPool[];
  getTotalLiquidityUsd(): number;
  getPoolLiquidityUsd(fromAssetId: string, toAssetId: string): number;
  findRoute(fromAssetId: string, toAssetId: string): import('@/types').DexRoute;
  calculateDexQuote(fromAssetId: string, toAssetId: string, fromAmount: number, slippage: number): import('@/types').DexQuote | null;
}
