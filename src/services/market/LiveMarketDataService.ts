/**
 * AERQVON Live Market Data Service
 * Fetches real market data from public, key-free APIs: CoinGecko and Binance.
 */

import type { Asset, Candlestick, OrderBook, TradingPair } from '@/types';
import { config } from '@/config';

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', USDC: 'usd-coin', USDT: 'tether',
};

const BINANCE_SYMBOLS: Record<string, string> = {
  'BTC/USDC': 'BTCUSDC', 'BTC/USDT': 'BTCUSDT', 'ETH/USDC': 'ETHUSDC',
  'ETH/USDT': 'ETHUSDT', 'BNB/USDC': 'BNBUSDC', 'BNB/USDT': 'BNBUSDT',
  'SOL/USDC': 'SOLUSDC', 'XRP/USDC': 'XRPUSDC', 'ADA/USDC': 'ADAUSDC', 'DOGE/USDC': 'DOGEUSDC',
};

const INTERVAL_MAP: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1D': '1d' };

interface CoinGeckoPrice { usd: number; usd_24h_change: number; usd_24h_vol: number; usd_24h_high: number; usd_24h_low: number; }

let priceCache: Map<string, { data: CoinGeckoPrice; ts: number }> = new Map();
const CACHE_TTL = 30000;

async function fetchCoinGeckoPrices(assetIds: string[]): Promise<Map<string, CoinGeckoPrice>> {
  const result = new Map<string, CoinGeckoPrice>();
  const now = Date.now();
  const toFetch: string[] = [];
  for (const id of assetIds) {
    const cached = priceCache.get(id);
    if (cached && now - cached.ts < CACHE_TTL) result.set(id, cached.data);
    else if (COINGECKO_IDS[id]) toFetch.push(id);
  }
  if (toFetch.length === 0) return result;
  const coinIds = toFetch.map((id) => COINGECKO_IDS[id]).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
  try {
    const resp = await fetch(url, { headers: { accept: 'application/json' } });
    if (!resp.ok) return result;
    const json = await resp.json();
    for (const id of toFetch) {
      const coinId = COINGECKO_IDS[id];
      const entry = json[coinId];
      if (entry && typeof entry.usd === 'number') {
        const data: CoinGeckoPrice = { usd: entry.usd, usd_24h_change: entry.usd_24h_change ?? 0, usd_24h_vol: entry.usd_24h_vol ?? 0, usd_24h_high: entry.usd_24h_high ?? entry.usd, usd_24h_low: entry.usd_24h_low ?? entry.usd };
        priceCache.set(id, { data, ts: now });
        result.set(id, data);
      }
    }
  } catch { /* network error */ }
  return result;
}

async function fetchBinanceTicker(binanceSymbol: string): Promise<{ lastPrice: number; change24h: number; high24h: number; low24h: number; volume24h: number } | null> {
  try {
    const resp = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
    if (!resp.ok) return null;
    const json = await resp.json();
    return { lastPrice: parseFloat(json.lastPrice), change24h: parseFloat(json.priceChangePercent), high24h: parseFloat(json.highPrice), low24h: parseFloat(json.lowPrice), volume24h: parseFloat(json.quoteVolume) };
  } catch { return null; }
}

async function fetchBinanceKlines(binanceSymbol: string, interval: string, limit: number): Promise<Candlestick[]> {
  try {
    const mapped = INTERVAL_MAP[interval] ?? '1h';
    if (config.marketDataApiUrl) {
      const url = `${config.marketDataApiUrl}/market-data?market=spot&symbol=${encodeURIComponent(binanceSymbol)}&interval=${encodeURIComponent(mapped)}&limit=${limit}`;
      const resp = await fetch(url, { headers: { accept: 'application/json' } });
      if (resp.ok) {
        const body = await resp.json();
        if (Array.isArray(body.candles)) return body.candles.map((k: { openTime:number; open:string; high:string; low:string; close:string; volume:string }) => ({
          timestamp: k.openTime, open: Number(k.open), high: Number(k.high), low: Number(k.low), close: Number(k.close), volume: Number(k.volume),
        }));
      }
    }
    const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${mapped}&limit=${limit}`);
    if (!resp.ok) return [];
    const json: unknown[][] = await resp.json();
    return json.map((k) => ({ timestamp: k[0] as number, open: parseFloat(k[1] as string), high: parseFloat(k[2] as string), low: parseFloat(k[3] as string), close: parseFloat(k[4] as string), volume: parseFloat(k[5] as string) }));
  } catch { return []; }
}

async function fetchBinanceOrderBook(binanceSymbol: string, limit: number): Promise<OrderBook> {
  try {
    const resp = await fetch(`https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=${limit}`);
    if (!resp.ok) return { bids: [], asks: [] };
    const json = await resp.json();
    const bids: [number, number][] = (json.bids ?? []).map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]);
    const asks: [number, number][] = (json.asks ?? []).map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]);
    return { bids, asks };
  } catch { return { bids: [], asks: [] }; }
}

async function fetchBinanceRecentTrades(binanceSymbol: string, limit: number): Promise<{ price: number; amount: number; time: number; isBuyerMaker: boolean }[]> {
  try {
    const resp = await fetch(`https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=${limit}`);
    if (!resp.ok) return [];
    const json = await resp.json();
    return (json ?? []).map((t: { price: string; qty: string; time: number; isBuyerMaker: boolean }) => ({ price: parseFloat(t.price), amount: parseFloat(t.qty), time: t.time, isBuyerMaker: t.isBuyerMaker }));
  } catch { return []; }
}


export function subscribeToKlineStream(pairSymbol: string, interval: string, onCandle: (candle: Candlestick) => void): () => void {
  const binanceSymbol = BINANCE_SYMBOLS[pairSymbol];
  if (!binanceSymbol || !config.supabaseUrl) return () => {};
  const mapped = INTERVAL_MAP[interval] ?? '1h';
  const base = config.supabaseUrl.replace(/^https:/, 'wss:').replace(/\/$/, '');
  const socket = new WebSocket(`${base}/functions/v1/market-stream?market=spot&symbol=${encodeURIComponent(binanceSymbol)}&interval=${encodeURIComponent(mapped)}`);
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      const k = message?.k;
      if (!k) return;
      onCandle({ timestamp: Number(k.t), open: Number(k.o), high: Number(k.h), low: Number(k.l), close: Number(k.c), volume: Number(k.v) });
    } catch {}
  };
  return () => socket.close();
}

export const liveMarketData = {
  fetchCoinGeckoPrices, fetchBinanceTicker, fetchBinanceKlines,
  fetchBinanceOrderBook, fetchBinanceRecentTrades, subscribeToKlineStream,
  getBinanceSymbol: (pairSymbol: string) => BINANCE_SYMBOLS[pairSymbol] ?? null,
  getCoinGeckoId: (assetId: string) => COINGECKO_IDS[assetId] ?? null,
};
