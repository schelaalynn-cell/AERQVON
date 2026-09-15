/**
 * AERQVON DEX Trading Service (DEMO)
 * Decentralized-exchange style swap trading on Solana.
 * Uses LiquidityService for routing and quotes, SwapService for execution.
 */

import type { AssetId, DexQuote, DexTransaction, DexTxStatus } from '@/types';
import { generateId } from '@/utils/secureId';
import { liquidityService } from './liquidityService';
import { transactionService } from './transactionService';
import { walletService } from './walletService';
import { solanaService } from './solanaService';
import { config } from '@/config';

let dexTxStore: DexTransaction[] = [];

function getQuote(fromAssetId: AssetId, toAssetId: AssetId, fromAmount: number, slippage: number): DexQuote | null {
  if (!solanaService.isTokenSupported(fromAssetId) || !solanaService.isTokenSupported(toAssetId)) return null;
  return liquidityService.calculateDexQuote(fromAssetId, toAssetId, fromAmount, slippage);
}

function executeSwap(fromAssetId: AssetId, toAssetId: AssetId, fromAmount: number, slippage: number): DexTransaction | null {
  const quote = getQuote(fromAssetId, toAssetId, fromAmount, slippage);
  if (!quote) return null;
  const balance = walletService.getBalance(fromAssetId);
  if (!balance || balance.amount < fromAmount + quote.networkFee) return null;

  const tx: DexTransaction = {
    id: generateId('dex-tx'),
    fromAssetId, toAssetId, fromAmount,
    toAmount: quote.toAmount,
    route: quote.route,
    status: 'confirmed',
    timestamp: Date.now(),
    networkFee: quote.networkFee,
    slippage, minReceived: quote.minReceived,
  };

  dexTxStore = [tx, ...dexTxStore];
  transactionService.addSwapTransaction({ fromAssetId, toAssetId, fromAmount, toAmount: quote.toAmount, fee: quote.networkFee });
  return tx;
}

function prepareSwap(fromAssetId: AssetId, toAssetId: AssetId, fromAmount: number, slippage: number): DexTransaction | null {
  const quote = getQuote(fromAssetId, toAssetId, fromAmount, slippage);
  if (!quote) return null;
  return {
    id: generateId('dex-prep'),
    fromAssetId, toAssetId, fromAmount,
    toAmount: quote.toAmount,
    route: quote.route,
    status: 'preparing',
    timestamp: Date.now(),
    networkFee: quote.networkFee,
    slippage, minReceived: quote.minReceived,
  };
}

function getTransactionHistory(): DexTransaction[] {
  return [...dexTxStore].sort((a, b) => b.timestamp - a.timestamp);
}

function getTransaction(id: string): DexTransaction | undefined {
  return dexTxStore.find((t) => t.id === id);
}

function getLiquidityForPair(fromAssetId: AssetId, toAssetId: AssetId): number {
  return liquidityService.getPoolLiquidityUsd(fromAssetId, toAssetId);
}

function getRoute(fromAssetId: AssetId, toAssetId: AssetId) {
  return liquidityService.findRoute(fromAssetId, toAssetId);
}

function getAllPools() {
  return liquidityService.getAllPools();
}

function getTotalLiquidity(): number {
  return liquidityService.getTotalLiquidityUsd();
}

export const dexTradingService = {
  getQuote, prepareSwap, executeSwap,
  getTransactionHistory, getTransaction,
  getLiquidityForPair, getRoute, getAllPools, getTotalLiquidity,
};

export const isDemoMode = config.demoMode;
