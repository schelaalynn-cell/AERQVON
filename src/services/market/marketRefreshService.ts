import { fetchTradingPairsAsync } from '@/services/marketService';
import { liveMarketData } from './LiveMarketDataService';
import {
  setMarketQuote,
  seedAqvDemoQuote,
} from './marketState';

let tickerUnsubscribers: Array<() => void> = [];
let marketStarted = false;

export async function refreshMarketState(): Promise<void> {
  seedAqvDemoQuote();
  await fetchTradingPairsAsync();
}

export function startMarketRefresh(): () => void {
  if (marketStarted) {
    return stopMarketRefresh;
  }

  marketStarted = true;
  console.log('[AERQVON][MARKET_REFRESH] starting live market subscriptions');
  seedAqvDemoQuote();

  void fetchTradingPairsAsync().then((pairs) => {
    if (!marketStarted) return;

    tickerUnsubscribers = pairs
      .filter((pair) => pair.status === 'live')
      .map((pair) => {
        const binanceSymbol = liveMarketData.getBinanceSymbol(pair.symbol);

        if (!binanceSymbol) {
          return () => {};
        }

        return liveMarketData.subscribeToTickerStream(
          pair.symbol,
          (ticker) => {
            if (!marketStarted) return;

            setMarketQuote({
              assetId: pair.baseAsset,
              symbol: pair.symbol,
              priceUsd: ticker.lastPrice,
              change24h: ticker.change24h,
              high24h: ticker.high24h,
              low24h: ticker.low24h,
              volume24h: ticker.volume24h,
              status: 'LIVE',
              source: 'BINANCE',
            });
          },
        );
      });
  });

  return stopMarketRefresh;
}

export function stopMarketRefresh(): void {
  if (!marketStarted) {
    return;
  }

  tickerUnsubscribers.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch {}
  });

  tickerUnsubscribers = [];
  marketStarted = false;
}
