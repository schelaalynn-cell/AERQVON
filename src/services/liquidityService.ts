/**
 * AERQVON Liquidity Service (DEMO)
 * Provides liquidity pool data for DEX trading.
 */

import type { AssetId, DexRoute, DexQuote, LiquidityPool } from '@/types';
import { ASSETS } from './walletService';
import { config } from '@/config';

const AQV_LIVE = Boolean(config.aqvSolanaMintAddress);
const AQV_RESERVE = 0;
const AQV_LIQUIDITY = 0;

const DEMO_POOLS: LiquidityPool[] = [
  { id: 'pool-aqv-sol', token0: 'AQV', token1: 'SOL', reserve0: AQV_RESERVE, reserve1: AQV_RESERVE, totalLiquidityUsd: AQV_LIQUIDITY, apr: 0, fee: 0.25 },
  { id: 'pool-aqv-usdc', token0: 'AQV', token1: 'USDC', reserve0: AQV_RESERVE, reserve1: AQV_RESERVE, totalLiquidityUsd: AQV_LIQUIDITY, apr: 0, fee: 0.25 },
  { id: 'pool-sol-usdc', token0: 'SOL', token1: 'USDC', reserve0: 6500, reserve1: 942500, totalLiquidityUsd: 942500, apr: 14.2, fee: 0.25 },
  { id: 'pool-bnb-usdc', token0: 'BNB', token1: 'USDC', reserve0: 1700, reserve1: 994500, totalLiquidityUsd: 994500, apr: 12.1, fee: 0.25 },
  { id: 'pool-usdc-usdt', token0: 'USDC', token1: 'USDT', reserve0: 500000, reserve1: 500000, totalLiquidityUsd: 1000000, apr: 5.2, fee: 0.01 },
  { id: 'pool-eth-usdc', token0: 'ETH', token1: 'USDC', reserve0: 160, reserve1: 508800, totalLiquidityUsd: 508800, apr: 15.4, fee: 0.25 },
];

function findPool(tokenA: AssetId, tokenB: AssetId): LiquidityPool | undefined {
  return DEMO_POOLS.find((p) => (p.token0 === tokenA && p.token1 === tokenB) || (p.token0 === tokenB && p.token1 === tokenA));
}

function getAllPools(): LiquidityPool[] { return DEMO_POOLS.map((p) => ({ ...p })); }

function getPoolsForToken(assetId: AssetId): LiquidityPool[] {
  return DEMO_POOLS.filter((p) => p.token0 === assetId || p.token1 === assetId).map((p) => ({ ...p }));
}

function getTotalLiquidityUsd(): number { return DEMO_POOLS.reduce((sum, p) => sum + p.totalLiquidityUsd, 0); }

function getPoolLiquidityUsd(fromAssetId: AssetId, toAssetId: AssetId): number {
  const pool = findPool(fromAssetId, toAssetId);
  if (pool) return pool.totalLiquidityUsd;
  const poolsA = getPoolsForToken(fromAssetId);
  const poolsB = getPoolsForToken(toAssetId);
  const commonToken = poolsA.find((pa) => poolsB.some((pb) => pa.token0 === pb.token0 || pa.token0 === pb.token1 || pa.token1 === pb.token0 || pa.token1 === pb.token1));
  if (commonToken) {
    const intermediate = commonToken.token0 === fromAssetId ? commonToken.token1 : commonToken.token0;
    const pool1 = findPool(fromAssetId, intermediate);
    const pool2 = findPool(intermediate, toAssetId);
    return Math.min(pool1?.totalLiquidityUsd ?? 0, pool2?.totalLiquidityUsd ?? 0);
  }
  return 0;
}

function findRoute(fromAssetId: AssetId, toAssetId: AssetId): DexRoute {
  if (fromAssetId === toAssetId) return { path: [fromAssetId], hops: 0, pools: [], estimatedOutput: 0, priceImpact: 0 };
  const directPool = findPool(fromAssetId, toAssetId);
  if (directPool) return { path: [fromAssetId, toAssetId], hops: 1, pools: [directPool.id], estimatedOutput: 0, priceImpact: 0 };
  const poolsFrom = getPoolsForToken(fromAssetId);
  for (const p of poolsFrom) {
    const intermediate = p.token0 === fromAssetId ? p.token1 : p.token0;
    const connectingPool = findPool(intermediate, toAssetId);
    if (connectingPool) return { path: [fromAssetId, intermediate, toAssetId], hops: 2, pools: [p.id, connectingPool.id], estimatedOutput: 0, priceImpact: 0 };
  }
  return { path: [fromAssetId, 'SOL', toAssetId], hops: 2, pools: ['pool-aqv-sol', 'pool-sol-usdc'], estimatedOutput: 0, priceImpact: 0 };
}

function getAsset(id: string) { return ASSETS.find((a) => a.id === id); }

function calculateDexQuote(fromAssetId: AssetId, toAssetId: AssetId, fromAmount: number, slippage: number): DexQuote | null {
  const fromAsset = getAsset(fromAssetId);
  const toAsset = getAsset(toAssetId);
  if (!fromAsset || !toAsset || fromAmount <= 0 || fromAssetId === toAssetId) return null;
  const route = findRoute(fromAssetId, toAssetId);
  const fromUsd = fromAmount * fromAsset.priceUsd;
  const toAmount = fromUsd / toAsset.priceUsd;
  const liquidityUsd = getPoolLiquidityUsd(fromAssetId, toAssetId);
  const impactScale = liquidityUsd > 0 ? fromUsd / liquidityUsd : 0;
  const priceImpact = Math.max(0, impactScale * 100 * 0.5);
  const slippageMultiplier = 1 - slippage / 100;
  const minReceived = toAmount * slippageMultiplier;
  route.estimatedOutput = toAmount;
  route.priceImpact = priceImpact;
  return { fromAssetId, toAssetId, fromAmount, toAmount, exchangeRate: fromAsset.priceUsd / toAsset.priceUsd, route, priceImpact, slippage, minReceived, networkFee: 0.001, feeAsset: 'SOL', liquidityUsd };
}

export const liquidityService = { findPool, getAllPools, getPoolsForToken, getTotalLiquidityUsd, getPoolLiquidityUsd, findRoute, calculateDexQuote };
export const isDemoMode = config.demoMode;
