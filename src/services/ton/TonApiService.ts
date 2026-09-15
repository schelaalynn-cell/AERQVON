/**
 * TON blockchain API service.
 * Queries real balance and transaction data from a TON HTTP API endpoint.
 * Never fabricates data — on failure returns an empty result with an error.
 */

import type { Balance } from '@/types';
import type { BalanceResult, BalanceStatus } from '@/services/interfaces';

const NANOTON_PER_TON = 1e9;
const DEFAULT_TIMEOUT_MS = 15000;

export interface TonAddressInfo {
  balance: string;
  state: 'uninit' | 'active' | 'frozen';
  last_transaction_id: { lt: string; hash: string };
  data?: string;
  code?: string;
  frozen_hash?: string;
}

export interface TonTransaction {
  transaction_id: { lt: string; hash: string };
  utime: number;
  in_msg: TonMessage | null;
  out_msgs: TonMessage[];
  fee: string;
  storage_fee: string;
  other_fee: string;
}

export interface TonMessage {
  source: string;
  destination: string;
  value: string;
  message: string;
  body: string;
  created_lt: string;
}

export class TonApiService {
  private _rpcUrl: string;
  private _apiKey: string | undefined;

  constructor(rpcUrl: string, apiKey?: string) {
    this._rpcUrl = rpcUrl.replace(/\/$/, '');
    this._apiKey = apiKey;
  }

  private async fetchJson<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this._apiKey) headers['X-API-Key'] = this._apiKey;
      const res = await fetch(`${this._rpcUrl}${path}`, {
        method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal,
      });
      if (!res.ok) throw new Error(`TON API HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'TON API returned an error');
      return json.result as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getAddressInfo(address: string): Promise<TonAddressInfo | null> {
    try {
      return await this.fetchJson<TonAddressInfo>('/getAddressInformation', { address });
    } catch { return null; }
  }

  async getTransactions(address: string, limit = 50): Promise<TonTransaction[]> {
    try {
      return await this.fetchJson<TonTransaction[]>('/getTransactions', { address, limit });
    } catch { return []; }
  }

  async getBalances(address: string): Promise<BalanceResult> {
    const info = await this.getAddressInfo(address);
    if (!info) return { balances: [], status: 'unavailable', lastUpdated: Date.now(), error: 'Unable to reach TON blockchain API' };
    if (info.state !== 'active') return { balances: [], status: 'unavailable', lastUpdated: Date.now(), error: `Wallet is not active (state: ${info.state})` };
    const tonBalance = parseInt(info.balance, 10) / NANOTON_PER_TON;
    if (!Number.isFinite(tonBalance) || tonBalance < 0) return { balances: [], status: 'unavailable', lastUpdated: Date.now(), error: 'Invalid balance returned from API' };
    const balances: Balance[] = [{ assetId: 'GRAM', amount: tonBalance, usdValue: 0 }];
    const status: BalanceStatus = 'fresh';
    return { balances, status, lastUpdated: Date.now() };
  }

  async getBalance(address: string, _assetId: string): Promise<Balance | null> {
    const result = await this.getBalances(address);
    return result.balances.find((b) => b.assetId === _assetId) ?? null;
  }

  async verifyTransaction(address: string, lt: string, hash: string): Promise<boolean> {
    try {
      const txs = await this.getTransactions(address, 50);
      return txs.some((tx) => tx.transaction_id.lt === lt && tx.transaction_id.hash === hash);
    } catch { return false; }
  }
}
