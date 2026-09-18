import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CandlestickChart } from '@/components/ui/CandlestickChart';
import { marketService, CHART_INTERVALS } from '@/services/marketService';
import { liveMarketData } from '@/services/market/LiveMarketDataService';
import { cexTradingService } from '@/services/cexTradingService';
import { useApp } from '@/context/AppContext';
import { useUi } from '@/hooks/useUi';
import type { OrderSide, OrderType, Candlestick, OrderBook } from '@/types';
import { X, Check, AlertCircle, Lock, ChevronDown, Activity, TrendingUp, TrendingDown, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const PAIR_OPTIONS = [
  'AQV/USDC', 'AQV/SOL',
  'BTC/USDC', 'BTC/USDT', 'ETH/USDC', 'ETH/USDT',
  'BNB/USDC', 'BNB/USDT', 'SOL/USDC', 'XRP/USDC', 'ADA/USDC', 'DOGE/USDC',
];

const ORDER_TYPE_TABS: { label: string; value: OrderType }[] = [
  { label: 'Market', value: 'market' },
  { label: 'Limit', value: 'limit' },
];

const HISTORY_TABS = [
  { label: 'Open Orders', value: 'open' },
  { label: 'Order History', value: 'history' },
  { label: 'Trade History', value: 'trades' },
] as const;

type HistoryTab = typeof HISTORY_TABS[number]['value'];
type ExecutionState = 'idle' | 'review' | 'processing' | 'success' | 'failed';

interface RecentTrade {
  price: number;
  amount: number;
  time: number;
  isBuyerMaker: boolean;
}

export function CEXTradeView() {
  const { submitServerOrder, cancelOrder, openOrders, orderHistory, tradeHistory, realizedPnl, unrealizedPnl, lockedBalances } = useApp();
  const { haptic, hapticNotify } = useUi();
  const [pairSymbol, setPairSymbol] = useState('AQV/USDC');
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [amount, setAmount] = useState('');
  const [limitPrice, setLimitPrice] = useState('');
  const [interval, setIntervalValue] = useState('1h');
  const [error, setError] = useState('');
  const [execState, setExecState] = useState<ExecutionState>('idle');
  const [execMessage, setExecMessage] = useState('');
  const [showPairPicker, setShowPairPicker] = useState(false);
  const [candles, setCandles] = useState<Candlestick[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [historyTab, setHistoryTab] = useState<HistoryTab>('open');

  const pair = marketService.getPair(pairSymbol);
  const price = pair ? (orderType === 'market' ? pair.lastPrice : (parseFloat(limitPrice) || pair.lastPrice)) : 0;
  const numAmount = parseFloat(amount) || 0;
  const total = numAmount * price;
  const fee = numAmount * 0.002;
  const totalPnl = realizedPnl + unrealizedPnl;
  const lockedForBase = pair ? lockedBalances.filter((l) => l.assetId === pair.baseAsset).reduce((s, l) => s + l.amount, 0) : 0;
  const lockedForQuote = pair ? lockedBalances.filter((l) => l.assetId === pair.quoteAsset).reduce((s, l) => s + l.amount, 0) : 0;
  const availableBase = pair ? cexTradingService.getAvailableBalance(pair.baseAsset) : 0;
  const availableQuote = pair ? cexTradingService.getAvailableBalance(pair.quoteAsset) : 0;
  const isProcessing = execState === 'processing' || execState === 'review';
  const marketValid = pair ? cexTradingService.isMarketDataValid(pairSymbol) : false;
  const isDemoPair = pair?.status === 'demo';
  const isPreLaunchPair = pair?.status === 'pre-launch';

  const fetchChartData = useCallback(async () => {
    setLoadingChart(true);
    const [c, ob, rt] = await Promise.all([
      marketService.fetchCandlesticksAsync(pairSymbol, interval, 48),
      marketService.fetchOrderBookAsync(pairSymbol, 20),
      marketService.fetchRecentTradesAsync(pairSymbol, 20),
    ]);
    setCandles(c); setOrderBook(ob); setRecentTrades(rt); setLoadingChart(false);
  }, [pairSymbol, interval]);

  useEffect(() => {
    void fetchChartData();
  }, [fetchChartData]);

  useEffect(() => {
    const unsubscribe = liveMarketData.subscribeToKlineStream(pairSymbol, interval, (candle) => {
      setCandles((current) => {
        const next = current.length > 0 && current[current.length - 1].timestamp === candle.timestamp
          ? [...current.slice(0, -1), candle]
          : [...current, candle].slice(-200);
        return next;
      });
    });
    return unsubscribe;
  }, [pairSymbol, interval]);

  useEffect(() => {
    const refreshSecondary = async () => {
      const [ob, rt] = await Promise.all([
        marketService.fetchOrderBookAsync(pairSymbol, 20),
        marketService.fetchRecentTradesAsync(pairSymbol, 20),
      ]);
      setOrderBook(ob);
      setRecentTrades(rt);
    };
    const ri = setInterval(() => { void refreshSecondary(); }, 10000);
    return () => clearInterval(ri);
  }, [pairSymbol]);

  const handlePairChange = (p: string) => { haptic('light'); setPairSymbol(p); setAmount(''); setLimitPrice(''); setError(''); setExecState('idle'); setShowPairPicker(false); };
  const handleSideChange = (s: OrderSide) => { haptic('light'); setSide(s); setError(''); setExecState('idle'); };
  const handleOrderTypeChange = (t: OrderType) => { haptic('light'); setOrderType(t); setError(''); setExecState('idle'); };
  const setPercentAmount = (pct: number) => { haptic('light'); if (side === 'sell') { const val = availableBase * (pct / 100); setAmount(val.toFixed(4)); } else { const maxAmount = availableQuote / price; const val = maxAmount * (pct / 100); setAmount(val.toFixed(4)); } };

  const handleReviewOpen = () => {
    setError(''); setExecState('idle'); haptic('medium');
    if (isProcessing) return;
    if (numAmount <= 0) { setError('Enter a valid amount greater than 0'); hapticNotify('error'); return; }
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) { setError('Enter a valid limit price'); hapticNotify('error'); return; }
    if (orderType === 'market' && !marketValid) { setError('Market data unavailable or stale. Please wait for prices to load.'); hapticNotify('error'); return; }
    if (orderType === 'limit' && !marketValid && !isDemoPair) { setError('Market data unavailable. Cannot validate limit order.'); hapticNotify('error'); return; }
    const usdValue = numAmount * price;
    if (usdValue < 1) { setError(`Minimum order value is $1.00. Current: $${usdValue.toFixed(2)}`); hapticNotify('error'); return; }
    if (side === 'sell' && numAmount > availableBase) { setError(`Insufficient available ${pair?.baseLabel ?? 'base'}. Available: ${availableBase.toFixed(4)}`); hapticNotify('error'); return; }
    if (side === 'buy' && total > availableQuote) { setError(`Insufficient available ${pair?.quoteLabel ?? 'quote'}. Available: ${availableQuote.toFixed(2)}`); hapticNotify('error'); return; }
    setExecState('review');
  };

  const handleConfirmExecute = async () => {
    if (isProcessing) return;
    haptic('medium');
    setExecState('processing');
    setExecMessage('');
    try {
      const order = await submitServerOrder(pairSymbol, side, orderType, numAmount, orderType === 'limit' ? parseFloat(limitPrice) : undefined);
      setExecMessage(`${side === 'buy' ? 'Buy' : 'Sell'} order accepted and queued by AERQVON. Order ID: ${order.id}`);
      hapticNotify('success');
      setExecState('success');
      setAmount('');
      setLimitPrice('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Order submission failed';
      setExecMessage(msg);
      setExecState('failed');
      hapticNotify('error');
    }
  };

  const handleDismissResult = () => { haptic('light'); setExecState('idle'); setExecMessage(''); setError(''); };
  const handleCancel = (orderId: string) => { haptic('medium'); if (cancelOrder(orderId)) hapticNotify('success'); else hapticNotify('error'); };
  const fmtPrice = (v: number) => v.toFixed(v < 1 ? 4 : 2);

  if (!pair) return null;
  const isUp = pair.change24h >= 0;
  const bestBid = orderBook.bids[0]?.[0] ?? pair.lastPrice;
  const bestAsk = orderBook.asks[0]?.[0] ?? pair.lastPrice;
  const spread = bestAsk - bestBid;
  const spreadPct = pair.lastPrice > 0 ? (spread / pair.lastPrice) * 100 : 0;

  return (
    <div className="space-y-3">
      {!marketValid && !isDemoPair && (<div className="flex items-center gap-2 rounded-xl bg-aerqvon-warning/10 border border-aerqvon-warning/20 px-3 py-2 animate-fade-in"><AlertCircle className="h-4 w-4 shrink-0 text-aerqvon-warning" /><p className="text-xs text-aerqvon-muted">Loading live market data... Trading will be enabled once prices are available.</p></div>)}
      <div className="flex items-start justify-between"><div><button onClick={() => { haptic('light'); setShowPairPicker((v) => !v); }} className="flex items-center gap-1.5 font-display text-lg font-bold transition-colors">{pairSymbol}<ChevronDown className={`h-4 w-4 text-aerqvon-dim transition-transform ${showPairPicker ? 'rotate-180' : ''}`} /></button><div className="mt-0.5 flex items-center gap-2"><span className="font-display text-xl font-bold">${fmtPrice(pair.lastPrice)}</span><span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{marketService.formatPct(pair.change24h)}</span></div></div><div className="flex flex-col items-end gap-1">{isPreLaunchPair && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">PRE-LAUNCH</span>}{isDemoPair && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">DEMO</span>}<span className="text-[10px] text-aerqvon-dim">Vol ${marketService.formatCompact(pair.volume24h)}</span></div></div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">{PAIR_OPTIONS.filter(p => p.startsWith(pair.baseLabel)).map((p) => (<button key={p} onClick={() => handlePairChange(p)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${pairSymbol === p ? 'bg-aerqvon-accent/15 text-aerqvon-accent' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>{p}</button>))}</div>
      {showPairPicker && (<Card className="divide-y divide-aerqvon-border animate-scale-in">{PAIR_OPTIONS.map((p) => (<button key={p} onClick={() => handlePairChange(p)} className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${pairSymbol === p ? 'bg-aerqvon-accent/10 text-aerqvon-accent' : 'text-aerqvon-text hover:bg-aerqvon-surface-2/50'}`}>{p}{pairSymbol === p && <Check className="h-4 w-4" />}</button>))}</Card>)}
      <div className="grid grid-cols-4 gap-2 rounded-xl bg-aerqvon-surface p-3"><div><p className="text-[9px] uppercase text-aerqvon-dim">24h High</p><p className="text-xs font-semibold text-aerqvon-success">${fmtPrice(pair.high24h)}</p></div><div><p className="text-[9px] uppercase text-aerqvon-dim">24h Low</p><p className="text-xs font-semibold text-aerqvon-error">${fmtPrice(pair.low24h)}</p></div><div><p className="text-[9px] uppercase text-aerqvon-dim">24h Vol</p><p className="text-xs font-semibold">${marketService.formatCompact(pair.volume24h)}</p></div><div><p className="text-[9px] uppercase text-aerqvon-dim">Spread</p><p className="text-xs font-semibold">${fmtPrice(spread)}</p></div></div>
      <Card className="overflow-hidden p-4"><div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">{CHART_INTERVALS.map((iv) => (<button key={iv.value} onClick={() => { haptic('light'); setIntervalValue(iv.value); }} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${interval === iv.value ? 'bg-aerqvon-accent/15 text-aerqvon-accent' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>{iv.label}</button>))}</div>{loadingChart ? <div className="flex h-[200px] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-aerqvon-accent border-t-transparent" /></div> : <CandlestickChart data={candles} height={200} />}</Card>
      <div className="grid grid-cols-2 gap-3"><Card className="overflow-hidden p-3"><div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wide text-aerqvon-dim">Order Book</p>{isDemoPair && <span className="text-[8px] text-aerqvon-warning">Simulated</span>}</div>{orderBook.asks.length > 0 || orderBook.bids.length > 0 ? <div className="space-y-0.5"><div className="flex justify-between text-[8px] text-aerqvon-dim/60 px-1"><span>Price</span><span>Amount</span></div>{orderBook.asks.slice(0, 5).reverse().map((ask, i) => { const askTotal = ask[0] * ask[1]; const maxAskTotal = Math.max(...orderBook.asks.slice(0, 5).map(a => a[0] * a[1])); return <div key={`ask-${i}`} className="relative flex items-center justify-between text-[10px] px-1"><div className="absolute right-0 top-0 bottom-0 bg-aerqvon-error/5 rounded" style={{ width: `${(askTotal / maxAskTotal) * 100}%` }} /><span className="relative text-aerqvon-error">${fmtPrice(ask[0])}</span><span className="relative text-aerqvon-dim">{ask[1].toFixed(4)}</span></div>; })}<div className="my-1 flex items-center justify-between border-t border-aerqvon-border pt-1"><span className="text-[10px] text-aerqvon-dim">Spread</span><span className="text-[10px] font-semibold text-aerqvon-accent">${fmtPrice(spread)} ({spreadPct.toFixed(2)}%)</span></div>{orderBook.bids.slice(0, 5).map((bid, i) => { const bidTotal = bid[0] * bid[1]; const maxBidTotal = Math.max(...orderBook.bids.slice(0, 5).map(b => b[0] * b[1])); return <div key={`bid-${i}`} className="relative flex items-center justify-between text-[10px] px-1"><div className="absolute right-0 top-0 bottom-0 bg-aerqvon-success/5 rounded" style={{ width: `${(bidTotal / maxBidTotal) * 100}%` }} /><span className="relative text-aerqvon-success">${fmtPrice(bid[0])}</span><span className="relative text-aerqvon-dim">{bid[1].toFixed(4)}</span></div>; })}</div> : <div className="flex h-[180px] items-center justify-center text-[10px] text-aerqvon-dim">{isPreLaunchPair ? 'Available after launch' : isDemoPair ? 'Simulated order book' : 'Loading...'}</div>}</Card><Card className="overflow-hidden p-3"><div className="mb-2 flex items-center gap-1.5"><Activity className="h-3 w-3 text-aerqvon-dim" /><p className="text-[10px] font-semibold uppercase tracking-wide text-aerqvon-dim">Recent Trades</p></div>{recentTrades.length > 0 ? <div className="space-y-0.5">{recentTrades.slice(0, 11).map((t, i) => <div key={i} className="flex items-center justify-between text-[10px]"><span className={t.isBuyerMaker ? 'text-aerqvon-error' : 'text-aerqvon-success'}>${fmtPrice(t.price)}</span><span className="text-aerqvon-dim">{t.amount.toFixed(4)}</span></div>)}</div> : <div className="flex h-[180px] items-center justify-center text-[10px] text-aerqvon-dim">{isDemoPair ? 'No live trades' : 'Loading...'}</div>}</Card></div>
      {(realizedPnl !== 0 || unrealizedPnl !== 0) && <div className="grid grid-cols-3 gap-2"><Card className="p-3"><p className="text-[10px] uppercase text-aerqvon-dim">Realized P/L</p><p className={`mt-1 text-sm font-semibold ${realizedPnl >= 0 ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{realizedPnl >= 0 ? '+' : ''}{marketService.formatUsd(realizedPnl)}</p></Card><Card className="p-3"><p className="text-[10px] uppercase text-aerqvon-dim">Unrealized P/L</p><p className={`mt-1 text-sm font-semibold ${unrealizedPnl >= 0 ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{unrealizedPnl >= 0 ? '+' : ''}{marketService.formatUsd(unrealizedPnl)}</p></Card><Card className="p-3"><p className="text-[10px] uppercase text-aerqvon-dim">Total P/L</p><p className={`mt-1 text-sm font-semibold ${totalPnl >= 0 ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{totalPnl >= 0 ? '+' : ''}{marketService.formatUsd(totalPnl)}</p></Card></div>}
      <Card className="p-4"><div className="mb-4 flex gap-2"><button onClick={() => handleSideChange('buy')} disabled={isProcessing} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${side === 'buy' ? 'bg-aerqvon-success text-white' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>Buy</button><button onClick={() => handleSideChange('sell')} disabled={isProcessing} className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${side === 'sell' ? 'bg-aerqvon-error text-white' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>Sell</button></div><div className="mb-4 flex gap-1">{ORDER_TYPE_TABS.map((t) => <button key={t.value} onClick={() => handleOrderTypeChange(t.value)} disabled={isProcessing} className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${orderType === t.value ? 'bg-aerqvon-accent/15 text-aerqvon-accent' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>{t.label}</button>)}</div>{orderType === 'limit' && <div className="mb-3"><label className="text-[10px] uppercase text-aerqvon-dim">Limit Price ({pair.quoteLabel})</label><input type="number" value={limitPrice} onChange={(e) => { setLimitPrice(e.target.value); setError(''); setExecState('idle'); }} disabled={isProcessing} placeholder={pair.lastPrice.toString()} className="mt-1 w-full rounded-xl bg-aerqvon-surface-2 px-4 py-3 text-sm text-aerqvon-text outline-none focus:ring-1 focus:ring-aerqvon-accent disabled:opacity-50" /></div>}<div className="mb-2"><label className="text-[10px] uppercase text-aerqvon-dim">Amount ({pair.baseLabel})</label><input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); setExecState('idle'); }} disabled={isProcessing} placeholder="0.00" className="mt-1 w-full rounded-xl bg-aerqvon-surface-2 px-4 py-3 text-sm text-aerqvon-text outline-none focus:ring-1 focus:ring-aerqvon-accent disabled:opacity-50" /></div><div className="mb-3 flex gap-2">{[25, 50, 75, 100].map((pct) => <button key={pct} onClick={() => setPercentAmount(pct)} disabled={isProcessing} className="flex-1 rounded-lg bg-aerqvon-surface-2 py-1.5 text-[11px] font-medium text-aerqvon-dim transition-colors hover:text-aerqvon-accent active:scale-95 disabled:opacity-50">{pct}%</button>)}</div><div className="space-y-1.5 rounded-xl bg-aerqvon-surface-2/50 p-3 text-xs"><div className="flex justify-between"><span className="text-aerqvon-dim">Price</span><span className="font-medium">${fmtPrice(price)}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Total</span><span className="font-medium">{total.toFixed(2)} {pair.quoteLabel}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Fee ({orderType === 'market' ? '0.2%' : '0.1%'})</span><span className="font-medium">{fee.toFixed(6)} {pair.baseLabel}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Est. received</span><span className="font-medium">{(numAmount - fee).toFixed(6)} {pair.baseLabel}</span></div></div><div className="mt-3 space-y-1"><div className="flex justify-between text-[10px] text-aerqvon-dim"><span>{pair.baseLabel} available: {availableBase.toFixed(4)}</span>{lockedForBase > 0 && <span className="flex items-center gap-0.5 text-aerqvon-warning"><Lock className="h-2.5 w-2.5" /> {lockedForBase.toFixed(4)} locked</span>}</div><div className="flex justify-between text-[10px] text-aerqvon-dim"><span>{pair.quoteLabel} available: {availableQuote.toFixed(2)}</span>{lockedForQuote > 0 && <span className="flex items-center gap-0.5 text-aerqvon-warning"><Lock className="h-2.5 w-2.5" /> {lockedForQuote.toFixed(2)} locked</span>}</div></div>{error && <p className="mt-3 rounded-lg bg-aerqvon-error/10 px-3 py-2 text-xs text-aerqvon-error">{error}</p>}<div className="mt-4"><Button fullWidth size="lg" disabled={isProcessing || isPreLaunchPair || (orderType === 'market' && !marketValid && !isDemoPair)} onClick={handleReviewOpen} className={side === 'buy' ? 'bg-aerqvon-success' : 'bg-aerqvon-error'}>{side === 'buy' ? 'Buy' : 'Sell'} {pair.baseLabel}</Button></div></Card>
      <div><div className="no-scrollbar mb-2 flex gap-1 overflow-x-auto">{HISTORY_TABS.map((tab) => { const count = tab.value === 'open' ? openOrders.length : tab.value === 'history' ? orderHistory.length : tradeHistory.length; return <button key={tab.value} onClick={() => { haptic('light'); setHistoryTab(tab.value); }} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${historyTab === tab.value ? 'bg-aerqvon-accent/15 text-aerqvon-accent' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>{tab.label} ({count})</button>; })}</div>
      {historyTab === 'open' && <>{openOrders.length > 0 ? <Card className="divide-y divide-aerqvon-border">{openOrders.map((o) => { const op = marketService.getPair(o.pairSymbol); return <div key={o.id} className="px-4 py-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`text-xs font-semibold ${o.side === 'buy' ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{o.side === 'buy' ? 'Buy' : 'Sell'}</span><span className="text-sm font-medium">{o.pairSymbol}</span><span className="text-[10px] uppercase text-aerqvon-dim">{o.type}</span>{op?.status === 'demo' && <span className="text-[8px] text-aerqvon-warning">DEMO</span>}</div><button onClick={() => handleCancel(o.id)} disabled={isProcessing} className="flex h-8 items-center gap-1 rounded-lg bg-aerqvon-surface-2 px-2 text-xs text-aerqvon-dim transition-colors hover:text-aerqvon-error disabled:opacity-50"><X className="h-3.5 w-3.5" />Cancel</button></div><div className="mt-1 flex justify-between text-[10px] text-aerqvon-dim"><span>{o.amount.toFixed(4)} @ ${fmtPrice(o.price)}</span><span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{marketService.formatTimeAgo(o.createdAt)}</span></div></div>; })}</Card> : <Card className="p-6 text-center"><p className="text-sm text-aerqvon-dim">No open orders</p><p className="mt-1 text-[10px] text-aerqvon-dim/60">Limit orders will appear here until filled or cancelled</p></Card>}</>}
      {historyTab === 'history' && <>{orderHistory.length > 0 ? <Card className="divide-y divide-aerqvon-border">{orderHistory.slice(0, 15).map((o) => <div key={o.id} className="px-4 py-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`text-xs font-semibold ${o.side === 'buy' ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{o.side === 'buy' ? 'Buy' : 'Sell'}</span><span className="text-sm font-medium">{o.pairSymbol}</span><span className="text-[10px] uppercase text-aerqvon-dim">{o.type}</span></div><div className="flex items-center gap-2">{o.realizedPnl !== undefined && o.realizedPnl !== 0 && <span className={`text-[10px] font-semibold ${o.realizedPnl >= 0 ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>P/L: {o.realizedPnl >= 0 ? '+' : ''}{marketService.formatUsd(o.realizedPnl)}</span>}<span className={`flex items-center gap-0.5 text-[10px] font-semibold ${o.status === 'filled' ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{o.status === 'filled' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}{o.status}</span></div></div><div className="mt-1 flex justify-between text-[10px] text-aerqvon-dim"><span>{o.amount.toFixed(4)} @ ${fmtPrice(o.filledPrice ?? o.price)}</span><span>{marketService.formatTimeAgo(o.filledAt ?? o.createdAt)}</span></div></div>)}</Card> : <Card className="p-6 text-center"><p className="text-sm text-aerqvon-dim">No order history</p></Card>}</>}
      {historyTab === 'trades' && <>{tradeHistory.length > 0 ? <Card className="divide-y divide-aerqvon-border">{tradeHistory.slice(0, 15).map((t) => <div key={t.id} className="px-4 py-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className={`text-xs font-semibold ${t.side === 'buy' ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{t.side === 'buy' ? 'Buy' : 'Sell'}</span><span className="text-sm font-medium">{t.pairSymbol}</span></div><span className="text-[10px] text-aerqvon-dim">{marketService.formatTimeAgo(t.timestamp)}</span></div><div className="mt-1 flex justify-between text-[10px] text-aerqvon-dim"><span>{t.amount.toFixed(4)} @ ${fmtPrice(t.price)}</span><span>Fee: {t.fee.toFixed(6)} {t.feeAsset}</span></div></div>)}</Card> : <Card className="p-6 text-center"><p className="text-sm text-aerqvon-dim">No trade history</p></Card>}</>}
      </div>
      {execState === 'review' && (<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" onClick={handleDismissResult}><div className="w-full max-w-md rounded-t-3xl bg-aerqvon-surface border-t border-aerqvon-border p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Review Order</h3><button onClick={handleDismissResult} className="text-aerqvon-dim"><X className="h-5 w-5" /></button></div><div className="mb-4 flex items-center gap-2"><span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${side === 'buy' ? 'bg-aerqvon-success/15 text-aerqvon-success' : 'bg-aerqvon-error/15 text-aerqvon-error'}`}>{side === 'buy' ? 'BUY' : 'SELL'}</span><span className="text-sm font-semibold">{pairSymbol}</span><span className="text-[10px] uppercase text-aerqvon-dim">{orderType}</span>{isPreLaunchPair && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">PRE-LAUNCH</span>}{isDemoPair && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">DEMO</span>}</div><div className="space-y-2 rounded-xl bg-aerqvon-surface-2/50 p-4 text-sm"><div className="flex justify-between"><span className="text-aerqvon-dim">Price</span><span className="font-medium">${fmtPrice(price)}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Amount</span><span className="font-medium">{numAmount.toFixed(4)} {pair.baseLabel}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Estimated total</span><span className="font-medium">{total.toFixed(2)} {pair.quoteLabel}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Fee ({orderType === 'market' ? '0.2%' : '0.1%'})</span><span className="font-medium">{fee.toFixed(6)} {pair.baseLabel}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Est. received</span><span className="font-medium">{(numAmount - fee).toFixed(6)} {pair.baseLabel}</span></div><div className="border-t border-aerqvon-border pt-2 flex justify-between"><span className="text-aerqvon-dim">Available {pair.quoteLabel}</span><span className="font-medium">{availableQuote.toFixed(2)}</span></div></div>{orderType === 'market' && !isDemoPair && <p className="mt-3 text-[10px] text-aerqvon-dim">Market orders execute at the best available price. Final price may vary slightly due to slippage (max 0.3%).</p>}{orderType === 'limit' && <p className="mt-3 text-[10px] text-aerqvon-dim">Limit orders are placed in the order book and execute when the market price reaches your limit price. Funds will be reserved until filled or cancelled.</p>}{isDemoPair && <div className="mt-3 flex items-start gap-2 rounded-lg bg-aerqvon-warning/10 p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-warning" /><p className="text-[11px] text-aerqvon-muted">Demo mode: This order is simulated. No real funds will be moved.</p></div>}<div className="mt-4 flex gap-2"><Button variant="secondary" fullWidth onClick={handleDismissResult}>Cancel</Button><Button fullWidth onClick={handleConfirmExecute} className={side === 'buy' ? 'bg-aerqvon-success' : 'bg-aerqvon-error'}>Confirm {side === 'buy' ? 'Buy' : 'Sell'}</Button></div></div></div>)}
      {execState === 'processing' && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in"><div className="w-full max-w-xs text-center animate-scale-in"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aerqvon-accent/15"><Loader2 className="h-8 w-8 animate-spin text-aerqvon-accent" /></div><h3 className="font-display text-lg font-bold">Processing Order</h3><p className="mt-1 text-sm text-aerqvon-muted">{orderType === 'market' ? 'Executing your market order...' : 'Placing your limit order...'}</p></div></div>)}
      {execState === 'success' && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={handleDismissResult}><div className="w-full max-w-sm text-center animate-scale-in"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aerqvon-success/15 animate-pop"><CheckCircle2 className="h-8 w-8 text-aerqvon-success" /></div><h3 className="font-display text-lg font-bold">{orderType === 'market' ? 'Order Executed' : 'Order Placed'}</h3><p className="mt-2 text-sm text-aerqvon-muted">{execMessage}</p>{isPreLaunchPair && <p className="mt-1 text-[10px] text-aerqvon-warning">PRE-LAUNCH · Trading opens after launch</p>}{isDemoPair && <p className="mt-1 text-[10px] text-aerqvon-warning">DEMO · Simulated trade</p>}<Button fullWidth className="mt-6" onClick={handleDismissResult}>Done</Button></div></div>)}
      {execState === 'failed' && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={handleDismissResult}><div className="w-full max-w-sm text-center animate-scale-in"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-aerqvon-error/15 animate-pop"><XCircle className="h-8 w-8 text-aerqvon-error" /></div><h3 className="font-display text-lg font-bold">Order Failed</h3><p className="mt-2 text-sm text-aerqvon-error">{execMessage}</p><Button fullWidth variant="secondary" className="mt-6" onClick={handleDismissResult}>Try Again</Button></div></div>)}
    </div>
  );
}
