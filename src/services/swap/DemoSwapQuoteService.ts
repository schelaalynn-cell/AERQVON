/**
 * Demo swap quote service.
 * Calculates quotes from hard-coded demo prices.
 * Quotes are clearly labeled as simulated — not connected to any DEX.
 */

import type { SwapQuote, AssetId } from '@/types';
import type { SwapQuoteService } from '@/services/interfaces';

const SLIPPAGE_DEFAULT = 0.5;
const TON_FEE = 0.05;

const DEMO_PRICES: Record<string, number> = {
  GRAM: 1.42,
  USDT: 1.0,
  BTC: 64250,
  ETH: 3180,
};

export class DemoSwapQuoteService implements SwapQuoteService {
  getQuote(fromAssetId: string, toAssetId: string, fromAmount: number): SwapQuote | null {
    const fromPrice = DEMO_PRICES[fromAssetId];
    const toPrice = DEMO_PRICES[toAssetId];

    if (fromPrice === undefined || toPrice === undefined) return null;
    if (fromAmount <= 0 || !Number.isFinite(fromAmount)) return null;

    const fromUsd = fromAmount * fromPrice;
    const exchangeRate = fromPrice / toPrice;
    const toAmount = fromUsd / toPrice;
    const slippageMultiplier = 1 - SLIPPAGE_DEFAULT / 100;
    const minReceived = toAmount * slippageMultiplier;
    const priceImpact = Math.max(0, (SLIPPAGE_DEFAULT / 100) * (fromAmount / 1000));

    return {
      fromAssetId: fromAssetId as AssetId,
      toAssetId: toAssetId as AssetId,
      fromAmount,
      toAmount,
      exchangeRate,
      networkFee: TON_FEE,
      feeAsset: 'GRAM',
      slippage: SLIPPAGE_DEFAULT,
      minReceived,
      priceImpact,
    };
  }

  getSupportedPairs(): { from: string; to: string }[] {
    return [
      { from: 'GRAM', to: 'USDT' },
      { from: 'USDT', to: 'GRAM' },
      { from: 'GRAM', to: 'BTC' },
      { from: 'GRAM', to: 'ETH' },
    ];
  }
}
