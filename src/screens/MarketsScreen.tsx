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

  const pairs = marketService.getTradingPairs();
  const pair = marketService.getPair(selectedPair) ?? pairs[0];

  useEffect(() => {
    let cancelled = false;
    marketService.fetchCandlesticksAsync(selectedPair, interval, 48).then((nextCandles) => {
      if (!cancelled) setCandles(nextCandles);
    });
    return () => { cancelled = true; };
  }, [selectedPair, interval, assets]);

  const filteredPairs = useMemo(() => {
    let result = pairs.filter((p) =>
      p.symbol.toLowerCase().includes(search.toLowerCase())
    );

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

  const handlePairClick = (p: TradingPair) => {
    haptic('light');
    setSelectedPair(p.symbol);
  };

  const handleTrade = () => {
    haptic('medium');
    navigate({ name: 'tab', tab: 'trade' });
  };

  const toggleFavorite = (symbol: string) => {
    haptic('light');
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    haptic('light');
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const fmtPrice = (v: number) => v.toFixed(v < 1 ? 4 : 2);

  return (
    <div>
      <ScreenHeader
        title="Markets"
        subtitle="Live prices & charts"
        right={<DemoBadge />}
      />

      <div className="space-y-3 px-4 py-4 pb-24">
        {/* Search bar */}
        <div className="flex items-center gap-2 rounded-xl bg-nova-surface px-3 py-2.5">
          <Search className="h-4 w-4 text-nova-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-nova-dim"
          />
        </div>

        {/* Selected pair chart */}
        <Card className="overflow-hidden p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold">{pair.symbol}</h2>
                {pair.status === 'pre-launch' && (
                  <span className="rounded bg-nova-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-nova-warning">PRE-LAUNCH</span>
                )}
                {pair.status === 'demo' && (
                  <span className="rounded bg-nova-warning/15 px-1.5 py-0.5 text-[9px] font-bold text-nova-warning">DEMO</span>
                )}
              </div>
              <p className="text-xs text-nova-muted">{pair.baseLabel} / {pair.quoteLabel}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-semibold">
                ${fmtPrice(pair.lastPrice)}
              </p>
              <p className={`text-xs font-semibold ${pair.change24h >= 0 ? 'text-nova-success' : 'text-nova-error'}`}>
                {marketService.formatPct(pair.change24h)}
              </p>
            </div>
          </div>

          <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
            {CHART_INTERVALS.map((iv) => (
              <button
                key={iv.value}
                onClick={() => { haptic('light'); setInterval(iv.value); }}
                className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  interval === iv.value
                    ? 'bg-nova-accent/15 text-nova-accent'
                    : 'bg-nova-surface-2 text-nova-dim'
                }`}
              >
                {iv.label}
              </button>
            ))}
          </div>

          <CandlestickChart data={candles} height={200} />
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2.5">
            <p className="text-[9px] uppercase text-nova-dim">24h High</p>
            <p className="mt-0.5 text-xs font-semibold text-nova-success">
              ${fmtPrice(pair.high24h)}
            </p>
          </Card>
          <Card className="p-2.5">
            <p className="text-[9px] uppercase text-nova-dim">24h Low</p>
            <p className="mt-0.5 text-xs font-semibold text-nova-error">
              ${fmtPrice(pair.low24h)}
            </p>
          </Card>
          <Card className="p-2.5">
            <p className="text-[9px] uppercase text-nova-dim">24h Vol</p>
            <p className="mt-0.5 text-xs font-semibold">
              ${marketService.formatCompact(pair.volume24h)}
            </p>
          </Card>
          <Card className="p-2.5">
            <p className="text-[9px] uppercase text-nova-dim">Status</p>
            <p className={`mt-0.5 text-xs font-semibold ${pair.status === 'live' ? 'text-nova-success' : 'text-nova-warning'}`}>
              {pair.status === 'live' ? 'Live' : pair.status === 'pre-launch' ? 'Pre-launch' : 'Demo'}
            </p>
          </Card>
        </div>

        <button
          onClick={handleTrade}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-nova-accent py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
        >
          <BarChart3 className="h-4 w-4" />
          Trade {pair.symbol}
        </button>

        {/* Market table */}
        <div>
          {/* Table header */}
          <div className="mb-1 flex items-center gap-2 px-2 text-[10px] uppercase tracking-wide text-nova-dim">
            <button onClick={() => handleSort('symbol')} className="flex-1 text-left">
              Pair {sortKey === 'symbol' && (sortDesc ? '↓' : '↑')}
            </button>
            <button onClick={() => handleSort('price')} className="w-20 text-right">
              Price {sortKey === 'price' && (sortDesc ? '↓' : '↑')}
            </button>
            <button onClick={() => handleSort('change')} className="w-16 text-right">
              24h {sortKey === 'change' && (sortDesc ? '↓' : '↑')}
            </button>
            <button onClick={() => handleSort('volume')} className="w-16 text-right">
              Vol {sortKey === 'volume' && (sortDesc ? '↓' : '↑')}
            </button>
          </div>

          <Card className="divide-y divide-nova-border">
            {filteredPairs.map((p) => {
              const isUp = p.change24h >= 0;
              const isFav = favorites.has(p.symbol);
              return (
                <button
                  key={p.symbol}
                  onClick={() => handlePairClick(p)}
                  className={`flex w-full items-center gap-2 px-3 py-3 transition-colors ${
                    selectedPair === p.symbol ? 'bg-nova-accent/5' : 'hover:bg-nova-surface-2/50'
                  }`}
                >
                  <div className="flex w-5 shrink-0">
                    <Star
                      className={`h-3.5 w-3.5 ${isFav ? 'fill-nova-warning text-nova-warning' : 'text-nova-dim'}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(p.symbol); }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">{p.symbol}</p>
                    {p.status === 'pre-launch' && (
                      <span className="text-[9px] text-nova-warning">PRE-LAUNCH</span>
                    )}
                    {p.status === 'demo' && (
                      <span className="text-[9px] text-nova-warning">DEMO</span>
                    )}
                  </div>
                  <div className="w-20 text-right">
                    <p className="text-sm font-semibold">${fmtPrice(p.lastPrice)}</p>
                  </div>
                  <div className={`w-16 text-right ${isUp ? 'text-nova-success' : 'text-nova-error'}`}>
                    <p className="text-xs font-semibold">{marketService.formatPct(p.change24h)}</p>
                  </div>
                  <div className="w-16 text-right">
                    <p className="text-xs text-nova-dim">${marketService.formatCompact(p.volume24h)}</p>
                  </div>
                </button>
              );
            })}
          </Card>

          {filteredPairs.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-nova-dim">No markets found for "{search}"</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}