import type { AssetId } from '@/types';

export type MarketQuoteStatus = 'LIVE' | 'STALE' | 'UNAVAILABLE' | 'DEMO';
export type MarketQuoteSource = 'BINANCE' | 'AQV_DEMO';

export interface MarketQuoteState {
  assetId: AssetId;
  symbol: string;
  priceUsd: number | null;
  change24h: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;
  status: MarketQuoteStatus;
  source: MarketQuoteSource;
  updatedAt: number | null;
  error: string | null;
}

const quotes = new Map<string, MarketQuoteState>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function normalizeNumber(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return value;
}

export function setMarketQuote(
  quote: Omit<MarketQuoteState, 'updatedAt' | 'error'> & {
    updatedAt?: number | null;
    error?: string | null;
  },
): void {
  quotes.set(quote.symbol, {
    ...quote,
    priceUsd: normalizeNumber(quote.priceUsd),
    change24h: normalizeNumber(quote.change24h),
    high24h: normalizeNumber(quote.high24h),
    low24h: normalizeNumber(quote.low24h),
    volume24h: normalizeNumber(quote.volume24h),
    updatedAt: quote.updatedAt ?? Date.now(),
    error: quote.error ?? null,
  });

  notify();
}

export function setMarketQuoteUnavailable(
  assetId: AssetId,
  symbol: string,
  source: MarketQuoteSource = 'BINANCE',
  error = 'Live market data is unavailable.',
): void {
  const previous = quotes.get(symbol);

  quotes.set(symbol, {
    assetId,
    symbol,
    priceUsd: previous?.priceUsd ?? null,
    change24h: previous?.change24h ?? null,
    high24h: previous?.high24h ?? null,
    low24h: previous?.low24h ?? null,
    volume24h: previous?.volume24h ?? null,
    status: previous?.priceUsd != null ? 'STALE' : 'UNAVAILABLE',
    source,
    updatedAt: previous?.updatedAt ?? null,
    error,
  });

  notify();
}

export function getMarketQuote(symbol: string): MarketQuoteState | null {
  return quotes.get(symbol) ?? null;
}

export function getMarketQuotes(): MarketQuoteState[] {
  return Array.from(quotes.values());
}

export function subscribeToMarketState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMarketSnapshot(): Map<string, MarketQuoteState> {
  return new Map(quotes);
}

export function seedAqvDemoQuote(): void {
  setMarketQuote({
    assetId: 'AQV',
    symbol: 'AQV/USDC',
    priceUsd: 0.12,
    change24h: 4.82,
    high24h: 0.128,
    low24h: 0.109,
    volume24h: 284500,
    status: 'DEMO',
    source: 'AQV_DEMO',
  });
}
