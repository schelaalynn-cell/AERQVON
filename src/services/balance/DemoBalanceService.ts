/**
 * Demo balance service.
 * Returns hard-coded balances that are clearly labeled as simulated.
 * Never fabricates balances when a real API fails — only used in demo mode.
 */

import type { Balance } from '@/types';
import type { BalanceService, BalanceResult } from '@/services/interfaces';

const DEMO_BALANCES: Balance[] = [
  { assetId: 'GRAM', amount: 12480.5, usdValue: 0 },
  { assetId: 'USDT', amount: 2150.0, usdValue: 0 },
  { assetId: 'BTC', amount: 0.0184, usdValue: 0 },
  { assetId: 'ETH', amount: 0.74, usdValue: 0 },
];

export class DemoBalanceService implements BalanceService {
  async getBalances(_address: string): Promise<BalanceResult> {
    return {
      balances: DEMO_BALANCES,
      status: 'fresh',
      lastUpdated: Date.now(),
    };
  }

  async getBalance(_address: string, assetId: string): Promise<Balance | null> {
    return DEMO_BALANCES.find((b) => b.assetId === assetId) ?? null;
  }
}
