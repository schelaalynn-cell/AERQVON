import { useSyncExternalStore } from 'react';
import type { AssetId } from '@/types';
import {
  getMarketQuote,
  subscribeToMarketState,
} from '@/services/market/marketState';

export function useMarketQuote(symbol: string) {
  return useSyncExternalStore(
    subscribeToMarketState,
    () => getMarketQuote(symbol),
    () => getMarketQuote(symbol),
  );
}

export function useAssetMarketQuote(assetId: AssetId) {
  const symbol = assetId === 'AQV' ? 'AQV/USDC' : `${assetId}/USDC`;
  return useMarketQuote(symbol);
}
