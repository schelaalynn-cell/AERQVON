/**
 * Demo market data service.
 * Returns hard-coded prices clearly labeled as simulated.
 */

import type { Asset, Candlestick, OrderBook, TradingPair } from '@/types';
import type { MarketDataService, MarketDataResult } from '@/services/interfaces';

const DEMO_ASSETS: Asset[] = [
  { id: 'AQV', name: 'AERQVON Token', symbol: 'AQV', networkId: 'BSC', networkName: 'BSC', type: 'bep20', decimals: 18, isSimulated: true, color: '#5b8cff', priceUsd: 0.12, change24h: 5.2 },
  { id: 'BNB', name: 'BNB', symbol: 'BNB', networkId: 'BSC', networkName: 'BSC', type: 'native', decimals: 18, isSimulated: true, color: '#f3ba2f', priceUsd: 585, change24h: 1.8 },
  { id: 'USDC', name: 'USD Coin', symbol: 'USDC', networkId: 'BSC', networkName: 'BSC', type: 'bep20', decimals: 18, isSimulated: true, color: '#2775ca', priceUsd: 1.0, change24h: 0.01 },
  { id: 'USDT', name: 'Tether USD', symbol: 'USDT', networkId: 'BSC', networkName: 'BSC', type: 'bep20', decimals: 18, isSimulated: true, color: '#26a17b', priceUsd: 1.0, change24h: 0.01 },
  { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', networkId: 'BTC', networkName: 'Bitcoin', type: 'simulated', decimals: 8, isSimulated: true, color: '#f7931a', priceUsd: 64250, change24h: -1.2 },
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH', networkId: 'ETH', networkName: 'Ethereum', type: 'erc20', decimals: 18, isSimulated: true, color: '#627eea', priceUsd: 3180, change24h: 2.4 },
  { id: 'GRAM', name: 'Gram', symbol: 'GRAM', networkId: 'TON', networkName: 'TON', type: 'native', decimals: 9, isSimulated: true, color: '#5b8cff', priceUsd: 1.42, change24h: 3.8 },
];

export class DemoMarketDataService implements MarketDataService {
  async getMarketData(): Promise<MarketDataResult> {
    return { assets: DEMO_ASSETS.map((a) => ({ ...a })), status: 'stale', lastUpdated: Date.now(), source: 'demo (hard-coded prices)' };
  }
  async getAssetPrice(assetId: string): Promise<number | null> {
    return DEMO_ASSETS.find((a) => a.id === assetId)?.priceUsd ?? null;
  }
  getTradingPairs(): TradingPair[] { return []; }
  getPair(_symbol: string): TradingPair | undefined { return undefined; }
  getCandlesticks(_symbol: string, _interval: string, _limit: number): Candlestick[] { return []; }
  getOrderBook(_symbol: string): OrderBook { return { bids: [], asks: [] }; }
}
