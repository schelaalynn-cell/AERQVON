/**
 * Demo swap execution service.
 * Executes simulated swaps that adjust demo balances.
 * Clearly labeled as demo — not connected to any real DEX.
 */

import type { SwapExecutionService } from '@/services/interfaces';

export class DemoSwapExecutionService implements SwapExecutionService {
  private balanceAdjust: (assetId: string, delta: number) => void;

  constructor(balanceAdjust: (assetId: string, delta: number) => void) {
    this.balanceAdjust = balanceAdjust;
  }

  isLive(): boolean {
    return false;
  }

  async execute(fromAssetId: string, toAssetId: string, fromAmount: number): Promise<boolean> {
    this.balanceAdjust(fromAssetId, -fromAmount);
    const demoPrices: Record<string, number> = { GRAM: 1.42, USDT: 1.0, BTC: 64250, ETH: 3180 };
    const fromUsd = fromAmount * (demoPrices[fromAssetId] ?? 0);
    const toAmount = fromUsd / (demoPrices[toAssetId] ?? 1);
    this.balanceAdjust(toAssetId, toAmount);
    return true;
  }
}
