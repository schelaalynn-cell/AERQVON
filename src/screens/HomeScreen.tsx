import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { marketService } from '@/services/marketService';
import { AssetRow } from '@/components/AssetRow';
import { TxRow } from '@/components/TxRow';
import { DemoBadge } from '@/components/DemoBadge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Copy, Send, ArrowDownLeft, ArrowLeftRight, ChevronRight, Eye, EyeOff, TrendingUp, TrendingDown, CandlestickChart } from 'lucide-react';
import type { Asset } from '@/types';

export function HomeScreen() {
  const { wallet, assets, balances, transactions, portfolio } = useApp();
  const { navigate } = useRouter();
  const { haptic, user, available } = useUi();
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const recentTx = transactions.slice(0, 4);
  const toggleHide = () => { haptic('light'); setHideBalance((v) => !v); };
  const formatAddr = (addr: string) => addr.slice(0, 4) + '...' + addr.slice(-6);
  const topMovers = assets.filter((a) => !a.isSimulated || a.id === 'AQV').sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 4);

  return (
    <div className="pb-24">
      <div className="relative overflow-hidden px-4 pt-6 pb-4 safe-top">
        <div className="absolute inset-0 bg-gradient-to-b from-nova-accent/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nova-accent to-nova-accent-2 text-sm font-bold text-white">{user.firstName.charAt(0)}</div>
              <div><p className="text-sm font-semibold">{available ? `@${user.username || user.firstName}` : user.firstName}</p><p className="text-xs text-nova-muted">AERQVON</p></div>
            </div>
            <DemoBadge />
          </div>
          <Card className="overflow-hidden p-5 animate-slide-up" glow>
            <div className="mb-1 flex items-center gap-2"><span className="text-xs text-nova-muted">Total Portfolio</span><button onClick={toggleHide} className="text-nova-dim transition-transform active:scale-90">{hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button></div>
            {loading ? <Skeleton className="h-9 w-40 rounded-lg" /> : <div className="font-display text-3xl font-bold tracking-tight animate-fade-in">{hideBalance ? '••••••' : marketService.formatUsd(portfolio.totalUsd)}</div>}
            <div className="mt-2 flex items-center gap-3">
              {loading ? <Skeleton className="h-5 w-32 rounded-md" /> : (<><span className={`inline-flex items-center gap-1 text-sm font-semibold ${portfolio.change24hPct >= 0 ? 'text-nova-success' : 'text-nova-error'}`}>{portfolio.change24hPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{hideBalance ? '••••' : marketService.formatPct(portfolio.change24hPct)}</span><span className="text-xs text-nova-muted">{hideBalance ? '••••' : `${portfolio.change24hUsd >= 0 ? '+' : ''}${marketService.formatUsd(portfolio.change24hUsd)}`}</span></>)}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-nova-surface-2 px-3 py-2.5">
              <div className="min-w-0"><p className="text-[10px] uppercase tracking-wide text-nova-dim">Wallet Address</p><p className="truncate font-mono text-xs">{hideBalance ? '••••••••' : formatAddr(wallet.address)}</p></div>
              <button onClick={() => { haptic('light'); navigator.clipboard?.writeText(wallet.address); }} className="flex items-center gap-1.5 rounded-lg bg-nova-surface-3 px-2.5 py-1.5 text-xs font-medium transition-transform active:scale-95"><Copy className="h-3.5 w-3.5" />Copy</button>
            </div>
          </Card>
          <div className="mt-4 grid grid-cols-4 gap-2.5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <QuickAction icon={ArrowDownLeft} label="Receive" onClick={() => navigate({ name: 'receive' })} />
            <QuickAction icon={Send} label="Send" onClick={() => navigate({ name: 'send' })} />
            <QuickAction icon={ArrowLeftRight} label="Swap" onClick={() => navigate({ name: 'swap-detail' })} />
            <QuickAction icon={CandlestickChart} label="Trade" onClick={() => navigate({ name: 'tab', tab: 'trade' })} />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-md px-4">
        <div className="mb-2.5 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Top Movers</h2><button onClick={() => navigate({ name: 'tab', tab: 'markets' })} className="flex items-center text-xs font-medium text-nova-accent">Markets <ChevronRight className="h-3.5 w-3.5" /></button></div>
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">{topMovers.map((asset) => <MoverCard key={asset.id} asset={asset} onClick={() => navigate({ name: 'asset', assetId: asset.id })} />)}</div>
        <div className="mb-2.5 mt-6 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Assets</h2><button onClick={() => navigate({ name: 'tab', tab: 'wallet' })} className="flex items-center text-xs font-medium text-nova-accent">See all <ChevronRight className="h-3.5 w-3.5" /></button></div>
        <div className="space-y-2.5">{loading ? Array.from({ length: 3 }).map((_, i) => (<Card key={i} className="p-3.5"><div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-24 rounded" /><Skeleton className="h-3 w-16 rounded" /></div><Skeleton className="h-4 w-20 rounded" /></div></Card>)) : balances.map((b, i) => { const asset = assets.find((a) => a.id === b.assetId); if (!asset) return null; return (<div key={b.assetId} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}><AssetRow asset={asset} amount={b.amount} usdValue={b.usdValue} onClick={() => navigate({ name: 'asset', assetId: asset.id })} /></div>); })}</div>
        <div className="mb-2.5 mt-6 flex items-center justify-between"><h2 className="font-display text-base font-semibold">Recent Activity</h2><button onClick={() => navigate({ name: 'activity' })} className="flex items-center text-xs font-medium text-nova-accent">See all <ChevronRight className="h-3.5 w-3.5" /></button></div>
        <Card className="overflow-hidden">{loading ? <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-20 rounded" /><Skeleton className="h-3 w-14 rounded" /></div><Skeleton className="h-3.5 w-16 rounded" /></div>))}</div> : recentTx.length > 0 ? <div className="divide-y divide-nova-border">{recentTx.map((tx) => <TxRow key={tx.id} tx={tx} onClick={() => navigate({ name: 'transaction', txId: tx.id })} />)}</div> : <div className="p-8 text-center text-sm text-nova-muted">No transactions yet</div>}</Card>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Send; label: string; onClick: () => void }) {
  const { haptic } = useUi();
  return (
    <button onClick={() => { haptic('light'); onClick(); }} className="flex flex-col items-center gap-1.5 rounded-2xl bg-nova-surface border border-nova-border p-3 transition-all active:scale-95 hover:border-nova-accent/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-nova-accent/10 text-nova-accent"><Icon className="h-5 w-5" /></div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function MoverCard({ asset, onClick }: { asset: Asset; onClick: () => void }) {
  const { haptic } = useUi();
  const isUp = asset.change24h >= 0;
  return (
    <button onClick={() => { haptic('light'); onClick(); }} className="w-28 shrink-0 rounded-xl bg-nova-surface border border-nova-border p-3 text-left transition-all active:scale-95 hover:border-nova-accent/30">
      <p className="text-sm font-bold">{asset.symbol}</p>
      <p className="mt-1 text-xs font-semibold">${asset.priceUsd.toFixed(asset.priceUsd < 1 ? 4 : 2)}</p>
      <div className={`mt-1 flex items-center gap-0.5 text-[11px] font-semibold ${isUp ? 'text-nova-success' : 'text-nova-error'}`}>{isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{marketService.formatPct(asset.change24h)}</div>
    </button>
  );
}
