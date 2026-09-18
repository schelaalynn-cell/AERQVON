import { useEffect, useState, useMemo } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DemoBadge } from '@/components/DemoBadge';
import { CandlestickChart } from '@/components/ui/CandlestickChart';
import { Card } from '@/components/ui/Card';
import { marketService, CHART_INTERVALS } from '@/services/marketService';
import { useRouter } from '@/context/RouterContext';
import { useApp } from '@/context/AppContext';
import { useUi } from '@/hooks/useUi';
import type { TradingPair } from '@/types';
import { Search, BarChart3, Star, TrendingUp, TrendingDown } from 'lucide-react';

type SortKey = 'symbol' | 'price' | 'change' | 'volume';

export function MarketsScreen() {
  const { navigate } = useRouter();
  const { haptic } = useUi();
  const { assets } = useApp();
  const [selectedPair, setSelectedPair] = useState<string>('AQV/USDC');
  const [interval, setInterval] = useState<string>('1h');
  const [candles, setCandles] = useState<ReturnType<typeof marketService.getCandlesticks>>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('volume');
  const [sortDesc, setSortDesc] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['AQV/USDC']));
  const [pairs, setPairs] = useState<TradingPair[]>(() => marketService.getTradingPairs());

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const nextPairs = await marketService.fetchTradingPairsAsync();
      if (!cancelled) setPairs(nextPairs);
    };

    void refresh();
    const timer = window.setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  const pair = pairs.find((p) => p.symbol === selectedPair) ?? pairs[0];

  useEffect(() => {
    let cancelled = false;

    setCandles([]);

    marketService.fetchCandlesticksAsync(selectedPair, interval, 48).then((nextCandles) => {
      if (!cancelled) {
        setCandles(nextCandles);
      }
    });

    const unsubscribe = marketService.subscribeToKlineStream(
      selectedPair,
      interval,
      (liveCandle) => {
        if (cancelled) return;

        setCandles((previous) => {
          if (previous.length === 0) {
            return [liveCandle];
          }

          const next = [...previous];
          const lastIndex = next.length - 1;
          const last = next[lastIndex];

          if (liveCandle.timestamp === last.timestamp) {
            next[lastIndex] = liveCandle;
            return next;
          }

          if (liveCandle.timestamp > last.timestamp) {
            next.push(liveCandle);

            if (next.length > 48) {
              next.shift();
            }
          }

          return next;
        });
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedPair, interval, assets]);

  const filteredPairs = useMemo(() => {
    let result = pairs.filter((p) => p.symbol.toLowerCase().includes(search.toLowerCase()));
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'price': cmp = a.lastPrice - b.lastPrice; break;
        case 'change': cmp = a.change24h - b.change24h; break;
        case 'volume': cmp = a.volume24h - b.volume24h; break;
      }
      return sortDesc ? -cmp : cmp;
    });
    const favs = result.filter((p) => favorites.has(p.symbol));
    const rest = result.filter((p) => !favorites.has(p.symbol));
    return [...favs, ...rest];
  }, [pairs, search, sortKey, sortDesc, favorites]);

  const handlePairClick = (p: TradingPair) => { haptic('light'); setSelectedPair(p.symbol); };
  const handleTrade = () => { haptic('medium'); navigate({ name: 'tab', tab: 'trade' }); };
  const toggleFavorite = (symbol: string) => { haptic('light'); setFavorites((prev) => { const next = new Set(prev); if (next.has(symbol)) next.delete(symbol); else next.add(symbol); return next; }); };
  const handleSort = (key: SortKey) => { haptic('light'); if (sortKey === key) setSortDesc(!sortDesc); else { setSortKey(key); setSortDesc(true); } };
  const fmtPrice = (v: number) => v.toFixed(v < 1 ? 4 : 2);

  return (
    <div>
      <ScreenHeader title="Markets" subtitle="Live prices & charts" right={<DemoBadge />} />
      <div className="space-y-3 px-4 py-4 pb-24">
        <div className="flex items-center gap-2 rounded-xl bg-aerqvon-surface px-3 py-2.5">
          <Search className="h-4 w-4 text-aerqvon-dim" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search markets..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-aerqvon-dim" />
        </div>
        <Card className="overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold">{pair.symbol}</h2>
                {pair.status === 'pre-launch' && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">PRE-LAUNCH</span>}
                {pair.status === 'demo' && <span className="rounded bg-aerqvon-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-aerqvon-warning">DEMO</span>}
              </div>
              <p className="text-xs text-aerqvon-muted">{pair.baseLabel} / {pair.quoteLabel}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-semibold">${fmtPrice(pair.lastPrice)}</p>
              <p className={`text-xs font-semibold ${pair.change24h >= 0 ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}>{marketService.formatPct(pair.change24h)}</p>
            </div>
          </div>
          <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
            {CHART_INTERVALS.map((iv) => (
              <button key={iv.value} onClick={() => { haptic('light'); setInterval(iv.value); }} className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${interval === iv.value ? 'bg-aerqvon-accent/15 text-aerqvon-accent' : 'bg-aerqvon-surface-2 text-aerqvon-dim'}`}>{iv.label}</button>
            ))}
          </div>
          <CandlestickChart data={candles} height={200} />
        </Card>
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2.5"><p className="text-[9px] uppercase text-aerqvon-dim">24h High</p><p className="mt-0.5 text-xs font-semibold text-aerqvon-success">${fmtPrice(pair.high24h)}</p></Card>
          <Card className="p-2.5"><p className="text-[9px] uppercase text-aerqvon-dim">24h Low</p><p className="mt-0.5 text-xs font-semibold text-aerqvon-error">${fmtPrice(pair.low24h)}</p></Card>
          <Card className="p-2.5"><p className="text-[9px] uppercase text-aerqvon-dim">24h Vol</p><p className="mt-0.5 text-xs font-semibold">${marketService.formatCompact(pair.volume24h)}</p></Card>
          <Card className="p-2.5"><p className="text-[9px] uppercase text-aerqvon-dim">Status</p><p className={`mt-0.5 text-xs font-semibold ${pair.status === 'live' ? 'text-aerqvon-success' : 'text-aerqvon-warning'}`}>{pair.status === 'live' ? 'Live' : pair.status === 'pre-launch' ? 'Pre-launch' : 'Demo'}</p></Card>
        </div>
        <button onClick={handleTrade} className="flex w-full items-center justify-center gap-2 rounded-xl bg-aerqvon-accent py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"><BarChart3 className="h-4 w-4" />Trade {pair.symbol}</button>
        <div>
          <div className="mb-1 flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-aerqvon-dim">
            <button onClick={() => handleSort('symbol')} className="flex-1 text-left">Pair {sortKey === 'symbol' && (sortDesc ? '↓' : '↑')}</button>
            <button onClick={() => handleSort('price')} className="w-20 text-right">Price {sortKey === 'price' && (sortDesc ? '↓' : '↑')}</button>
            <button onClick={() => handleSort('change')} className="w-16 text-right">24h {sortKey === 'change' && (sortDesc ? '↓' : '↑')}</button>
            <button onClick={() => handleSort('volume')} className="w-16 text-right">Vol {sortKey === 'volume' && (sortDesc ? '↓' : '↑')}</button>
          </div>
          <Card className="divide-y divide-aerqvon-border">
            {filteredPairs.map((p) => {
              const isUp = p.change24h >= 0;
              const isFav = favorites.has(p.symbol);
              return (
                <button key={p.symbol} onClick={() => handlePairClick(p)} className={`flex w-full items-center gap-2 px-3 py-3 transition-colors ${selectedPair === p.symbol ? 'bg-aerqvon-accent/5' : 'hover:bg-aerqvon-surface-2/50'}`}>
                  <div className="flex w-5 shrink-0"><Star className={`h-3.5 w-3.5 ${isFav ? 'fill-aerqvon-warning text-aerqvon-warning' : 'text-aerqvon-dim'}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(p.symbol); }} /></div>
                  <div className="flex-1 text-left"><p className="text-sm font-semibold">{p.symbol}</p>{p.status === 'pre-launch' && <span className="text-[9px] text-aerqvon-warning">PRE-LAUNCH</span>}{p.status === 'demo' && <span className="text-[9px] text-aerqvon-warning">DEMO</span>}</div>
                  <div className="w-20 text-right"><p className="text-sm font-semibold">${fmtPrice(p.lastPrice)}</p></div>
                  <div className={`w-16 text-right ${isUp ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}><p className="text-xs font-semibold">{marketService.formatPct(p.change24h)}</p></div>
                  <div className="w-16 text-right"><p className="text-xs text-aerqvon-dim">${marketService.formatCompact(p.volume24h)}</p></div>
                </button>
              );
            })}
          </Card>
          {filteredPairs.length === 0 && <Card className="p-6 text-center"><p className="text-sm text-aerqvon-dim">No markets found for "{search}"</p></Card>}
        </div>
      </div>
    </div>
  );
}
