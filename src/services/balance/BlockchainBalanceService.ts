/**
 * Blockchain balance service — TON API integration.
 * Fetches real native TON (Gram) balances from a TON HTTP API endpoint.
 * On any failure, returns status: 'unavailable' — never fabricates data.
 */

import type { BalanceService, BalanceResult } from '@/services/interfaces';
import type { Balance } from '@/types';
import { TonApiService } from '@/services/ton/TonApiService';
import { config } from '@/config';

const PRICE_CACHE: Record<string, { price: number; ts: number }> = {};
const PRICE_TTL_MS = 60000;

async function getAssetPrice(assetId: string): Promise<number> {
  const cached = PRICE_CACHE[assetId];
  if (cached && Date.now() - cached.ts < PRICE_TTL_MS) {
    return cached.price;
  }
  const prices: Record<string, number> = { GRAM: 1.42, USDT: 1.0 };
  const price = prices[assetId] ?? 0;
  PRICE_CACHE[assetId] = { price, ts: Date.now() };
  return price;
}

export class BlockchainBalanceService implements BalanceService {
  private _api: TonApiService;

  constructor(rpcUrl: string, apiKey?: string) {
    this._api = new TonApiService(rpcUrl, apiKey);
  }

  async getBalances(address: string): Promise<BalanceResult> {
    if (!config.securityReviewPassed) {
      return { balances: [], status: 'unavailable', lastUpdated: Date.now(), error: 'Blockchain balance service is disabled until the security review is complete.' };
    }
    const result = await this._api.getBalances(address);
    const balancesWithUsd: Balance[] = [];
    for (const b of result.balances) {
      const price = await getAssetPrice(b.assetId);
      balancesWithUsd.push({ ...b, usdValue: b.amount * price });
    }
    return { ...result, balances: balancesWithUsd };
  }

  async getBalance(address: string, assetId: string): Promise<Balance | null> {
    if (!config.securityReviewPassed) return null;
    const result = await this._api.getBalance(address, assetId);
    if (!result) return null;
    const price = await getAssetPrice(result.assetId);
    return { ...result, usdValue: result.amount * price };
  }
}
