import type {
  Asset,
  Candlestick,
  OrderBook,
  PortfolioSummary,
  TradingPair,
} from '@/types';
import { ASSETS } from './walletService';
import { liveMarketData } from './market/LiveMarketDataService';
import {
  setMarketQuote,
  setMarketQuoteUnavailable,
} from './market/marketState';

export const CHART_INTERVALS = [
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
] as const;

type ChartInterval = (typeof CHART_INTERVALS)[number]['value'];

interface RecentTrade {
  price: number;
  amount: number;
  isBuyerMaker: boolean;
  time: number;
}

const AQV_DEMO_PAIR: TradingPair = {
  symbol: 'AQV/USDC',
  baseAsset: 'AQV' as Asset['id'],
  quoteAsset: 'USDC' as Asset['id'],
  baseLabel: 'AQV',
  quoteLabel: 'USDC',
  lastPrice: 0.12,
  change24h: 4.82,
  high24h: 0.128,
  low24h: 0.109,
  volume24h: 284500,
  status: 'demo',
};

const LIVE_PAIR_DEFINITIONS: Array<{
  symbol: string;
  baseAsset: Asset['id'];
  quoteAsset: Asset['id'];
}> = [
  { symbol: 'BTC/USDC', baseAsset: 'BTC', quoteAsset: 'USDC' },
  { symbol: 'BTC/USDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
  { symbol: 'ETH/USDC', baseAsset: 'ETH', quoteAsset: 'USDC' },
  { symbol: 'ETH/USDT', baseAsset: 'ETH', quoteAsset: 'USDT' },
  { symbol: 'BNB/USDC', baseAsset: 'BNB', quoteAsset: 'USDC' },
  { symbol: 'BNB/USDT', baseAsset: 'BNB', quoteAsset: 'USDT' },
  { symbol: 'SOL/USDC', baseAsset: 'SOL', quoteAsset: 'USDC' },
  { symbol: 'XRP/USDC', baseAsset: 'XRP', quoteAsset: 'USDC' },
  { symbol: 'ADA/USDC', baseAsset: 'ADA', quoteAsset: 'USDC' },
  { symbol: 'DOGE/USDC', baseAsset: 'DOGE', quoteAsset: 'USDC' },
];

function getMarketData(): Asset[] {
  return ASSETS.map((a) => ({ ...a }));
}

function getPortfolioSummary(
  balances: { assetId: string; amount: number }[],
): PortfolioSummary {
  let totalUsd = 0;
  let prevUsd = 0;

  for (const b of balances) {
    const asset = ASSETS.find((a) => a.id === b.assetId);
    if (!asset) continue;

    const usd = b.amount * asset.priceUsd;
    totalUsd += usd;
    prevUsd += usd / (1 + asset.change24h / 100);
  }

  const change24hUsd = totalUsd - prevUsd;
  const change24hPct =
    prevUsd > 0 ? (change24hUsd / prevUsd) * 100 : 0;

  return {
    totalUsd,
    change24hUsd,
    change24hPct,
  };
}

function createLivePair(
  definition: (typeof LIVE_PAIR_DEFINITIONS)[number],
): TradingPair {
  const baseAsset = ASSETS.find((asset) => asset.id === definition.baseAsset);
  const quoteAsset = ASSETS.find((asset) => asset.id === definition.quoteAsset);

  return {
    symbol: definition.symbol,
    baseAsset: definition.baseAsset,
    quoteAsset: definition.quoteAsset,
    baseLabel: baseAsset?.symbol ?? definition.baseAsset,
    quoteLabel: quoteAsset?.symbol ?? definition.quoteAsset,
    lastPrice: baseAsset?.priceUsd ?? 0,
    change24h: baseAsset?.change24h ?? 0,
    high24h: baseAsset?.priceUsd ?? 0,
    low24h: baseAsset?.priceUsd ?? 0,
    volume24h: 0,
    status: 'live',
  };
}

function getTradingPairs(): TradingPair[] {
  return [
    { ...AQV_DEMO_PAIR },
    ...LIVE_PAIR_DEFINITIONS.map(createLivePair),
  ];
}

function getPair(symbol: string): TradingPair | undefined {
  return getTradingPairs().find((pair) => pair.symbol === symbol);
}

export async function fetchTradingPairsAsync(): Promise<TradingPair[]> {
  const pairs = getTradingPairs();

  const livePairs = await Promise.all(
    pairs.map(async (pair) => {
      if (pair.status !== 'live') return pair;

      const binanceSymbol = liveMarketData.getBinanceSymbol(pair.symbol);

      if (!binanceSymbol) {
        setMarketQuoteUnavailable(
          pair.baseAsset,
          pair.symbol,
          'BINANCE',
          `No Binance symbol mapping exists for ${pair.symbol}.`,
        );
        return pair;
      }

      const ticker = await liveMarketData.fetchBinanceTicker(binanceSymbol);

      if (!ticker) {
        setMarketQuoteUnavailable(
          pair.baseAsset,
          pair.symbol,
          'BINANCE',
          `Live Binance ticker is unavailable for ${pair.symbol}.`,
        );
        return pair;
      }

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

      return {
        ...pair,
        lastPrice: ticker.lastPrice,
        change24h: ticker.change24h,
        high24h: ticker.high24h,
        low24h: ticker.low24h,
        volume24h: ticker.volume24h,
      };
    }),
  );

  if (livePairs.some((pair, index) => pair !== pairs[index])) {
    lastFetchTs = Date.now();
  }

  return livePairs;
}

function isDemoPair(symbol: string): boolean {
  return symbol === AQV_DEMO_PAIR.symbol;
}

function getLastFetchTs(): number {
  return lastFetchTs;
}

let lastFetchTs = 0;

function getIntervalMs(interval: string): number {
  switch (interval as ChartInterval) {
    case '5m':
      return 5 * 60 * 1000;
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '4h':
      return 4 * 60 * 60 * 1000;
    case '1d':
      return 24 * 60 * 60 * 1000;
    default:
      return 60 * 60 * 1000;
  }
}

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function getDemoCandlesticks(
  symbol = AQV_DEMO_PAIR.symbol,
  interval = '1h',
  count = 48,
): Candlestick[] {
  const pair = AQV_DEMO_PAIR;
  const safeCount = Math.max(1, Math.min(count, 200));
  const step = getIntervalMs(interval);
  const now = Date.now();
  const start = now - safeCount * step;

  const candles: Candlestick[] = [];
  let previousClose =
    pair.lastPrice * (1 - pair.change24h / 100);

  for (let i = 0; i < safeCount; i += 1) {
    const timestamp = start + i * step;
    const trend =
      (pair.lastPrice * (pair.change24h / 100)) / safeCount;
    const noise =
      pair.lastPrice *
      0.012 *
      seededNoise(i + symbol.length * 17);

    const open = previousClose;
    const close = Math.max(
      0.00000001,
      open + trend + noise,
    );

    const spread = Math.max(
      pair.lastPrice * 0.004,
      Math.abs(close - open) * 0.8,
    );

    candles.push({
      timestamp,
      open,
      high: Math.max(open, close) + spread,
      low: Math.max(
        0.00000001,
        Math.min(open, close) - spread,
      ),
      close,
      volume:
        Math.max(1, pair.volume24h / safeCount) *
        (0.65 + Math.abs(seededNoise(i + 91))),
    });

    previousClose = close;
  }

  return candles;
}

function getCandlesticks(
  symbol = AQV_DEMO_PAIR.symbol,
  interval = '1h',
  count = 48,
): Candlestick[] {
  if (isDemoPair(symbol)) {
    return getDemoCandlesticks(symbol, interval, count);
  }

  return [];
}

async function fetchCandlesticksAsync(
  symbol: string,
  interval: string,
  count = 48,
): Promise<Candlestick[]> {
  if (isDemoPair(symbol)) {
    lastFetchTs = Date.now();
    return getDemoCandlesticks(symbol, interval, count);
  }

  const binanceSymbol = liveMarketData.getBinanceSymbol(symbol);

  if (!binanceSymbol) {
    return [];
  }

  const candles = await liveMarketData.fetchBinanceKlines(
    binanceSymbol,
    interval,
    count,
  );

  if (candles.length > 0) {
    lastFetchTs = Date.now();
  }

  return candles;
}

function subscribeToKlineStream(
  symbol: string,
  interval: string,
  onCandle: (candle: Candlestick) => void,
): () => void {
  return liveMarketData.subscribeToKlineStream(symbol, interval, onCandle);
}

function getDemoOrderBook(
  symbol: string,
  depth = 20,
): OrderBook {
  const pair = AQV_DEMO_PAIR;
  const safeDepth = Math.max(1, Math.min(depth, 50));
  const spread = Math.max(pair.lastPrice * 0.001, 0.00000001);
  const step = Math.max(pair.lastPrice * 0.0015, 0.00000001);

  const bids: [number, number][] = [];
  const asks: [number, number][] = [];

  for (let i = 0; i < safeDepth; i += 1) {
    const bidPrice = Math.max(
      0.00000001,
      pair.lastPrice - spread - i * step,
    );

    const askPrice =
      pair.lastPrice + spread + i * step;

    const baseAmount =
      Math.max(
        0.001,
        pair.volume24h /
          Math.max(pair.lastPrice, 0.00000001) /
          100000,
      );

    bids.push([
      bidPrice,
      baseAmount *
        (1 + Math.abs(seededNoise(i + 201))),
    ]);

    asks.push([
      askPrice,
      baseAmount *
        (1 + Math.abs(seededNoise(i + 401))),
    ]);
  }

  return { bids, asks };
}

async function fetchOrderBookAsync(
  symbol: string,
  depth = 20,
): Promise<OrderBook> {
  if (isDemoPair(symbol)) {
    lastFetchTs = Date.now();
    return getDemoOrderBook(symbol, depth);
  }

  const binanceSymbol = liveMarketData.getBinanceSymbol(symbol);

  if (!binanceSymbol) {
    return { bids: [], asks: [] };
  }

  const orderBook =
    await liveMarketData.fetchBinanceOrderBook(
      binanceSymbol,
      depth,
    );

  if (
    orderBook.bids.length > 0 ||
    orderBook.asks.length > 0
  ) {
    lastFetchTs = Date.now();
  }

  return orderBook;
}

function getDemoRecentTrades(
  symbol: string,
  count = 20,
): RecentTrade[] {
  const pair = AQV_DEMO_PAIR;
  const safeCount = Math.max(1, Math.min(count, 100));

  const trades: RecentTrade[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const movement =
      pair.lastPrice *
      0.003 *
      seededNoise(i + 701);

    trades.push({
      price: Math.max(
        0.00000001,
        pair.lastPrice + movement,
      ),
      amount: Math.max(
        0.0001,
        (pair.volume24h /
          Math.max(pair.lastPrice, 0.00000001) /
          1000000) *
          (0.5 + Math.abs(seededNoise(i + 801))),
      ),
      isBuyerMaker: seededNoise(i + 901) > 0,
      time: Date.now() - i * 15000,
    });
  }

  return trades;
}

async function fetchRecentTradesAsync(
  symbol: string,
  count = 20,
): Promise<RecentTrade[]> {
  if (isDemoPair(symbol)) {
    lastFetchTs = Date.now();
    return getDemoRecentTrades(symbol, count);
  }

  const binanceSymbol = liveMarketData.getBinanceSymbol(symbol);

  if (!binanceSymbol) {
    return [];
  }

  const trades =
    await liveMarketData.fetchBinanceRecentTrades(
      binanceSymbol,
      count,
    );

  if (trades.length > 0) {
    lastFetchTs = Date.now();
  }

  return trades;
}

function formatUsd(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAmount(
  value: number,
  decimals = 4,
): string {
  if (value === 0) return '0';
  if (value < 0.01) return value.toFixed(decimals);

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

function formatPrice(value: number): string {
  if (value >= 1000) return formatUsd(value);
  return '$' + value.toFixed(value < 1 ? 4 : 2);
}

function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0';

  const abs = Math.abs(value);

  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toFixed(2);
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);

  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
    },
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export const marketService = {
  getLastFetchTs,
  getMarketData,
  getPortfolioSummary,
  getTradingPairs,
  fetchTradingPairsAsync,
  getPair,
  getCandlesticks,
  fetchCandlesticksAsync,
  subscribeToKlineStream,
  fetchOrderBookAsync,
  fetchRecentTradesAsync,
  formatUsd,
  formatAmount,
  formatPrice,
  formatPct,
  formatCompact,
  formatTimeAgo,
  formatDate,
};
