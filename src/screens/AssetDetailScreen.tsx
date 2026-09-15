import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { marketService } from '@/services/marketService';
import { walletService } from '@/services/walletService';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { TxRow } from '@/components/TxRow';
import { ArrowDownLeft, Send, ArrowLeftRight, Globe, Hash, Layers, TrendingUp, TrendingDown, Rocket, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export function AssetDetailScreen({ assetId }: { assetId: string }) {
  const { assets, balances, transactions } = useApp();
  const { navigate } = useRouter();
  const { haptic } = useUi();
  const [mintCopied, setMintCopied] = useState(false);
  const asset = assets.find((a) => a.id === assetId);
  const balance = balances.find((b) => b.assetId === assetId);
  const network = asset ? walletService.getNetwork(asset.networkId) : undefined;
  const assetTxs = transactions.filter((t) => t.assetId === assetId);

  if (!asset) return <div className="flex min-h-screen items-center justify-center text-nova-muted">Asset not found</div>;

  const positive = asset.change24h >= 0;
  const amount = balance?.amount ?? 0;
  const usdValue = balance?.usdValue ?? 0;

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title={asset.name} subtitle={asset.symbol} />
      <div className="mx-auto max-w-md px-4 pt-4">
        <Card className="overflow-hidden p-5 animate-scale-in" glow>
          <div className="flex items-center gap-3"><div className="relative"><AssetIcon asset={asset} size={52} />{asset.isSimulated && <span className="absolute -bottom-1 -right-1 rounded-full bg-nova-bg px-1 py-0.5 text-[7px] font-bold uppercase text-nova-warning">Sim</span>}</div><div><h2 className="font-display text-xl font-bold">{asset.name}</h2><p className="text-sm text-nova-muted">{asset.symbol}</p>{asset.launchStatus && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${asset.launchStatus === 'live' ? 'bg-nova-success/15 text-nova-success' : 'bg-nova-warning/15 text-nova-warning'}`}>{asset.launchStatus === 'live' ? 'LIVE' : 'PRE-LAUNCH'}</span>}</div></div>
          <div className="mt-5"><p className="text-xs text-nova-muted">Balance</p><p className="mt-1 font-display text-3xl font-bold">{marketService.formatAmount(amount, asset.decimals)} <span className="text-lg text-nova-muted">{asset.symbol}</span></p><p className="mt-1 text-sm text-nova-muted">{marketService.formatUsd(usdValue)}</p></div>
          <div className="mt-4 grid grid-cols-2 gap-2.5"><Button variant="secondary" fullWidth onClick={() => { haptic('light'); navigate({ name: 'receive', assetId }); }}><ArrowDownLeft className="mr-1.5 inline h-4 w-4" />Receive</Button><Button fullWidth onClick={() => { haptic('light'); navigate({ name: 'send', assetId }); }}><Send className="mr-1.5 inline h-4 w-4" />Send</Button></div>
        </Card>
        <div className="mt-4 space-y-2.5"><h3 className="font-display text-sm font-semibold text-nova-muted">Asset Info</h3><Card className="divide-y divide-nova-border"><InfoRow icon={Globe} label="Network" value={network?.name ?? asset.networkName} /><InfoRow icon={Hash} label="Asset" value={asset.name} /><InfoRow icon={Layers} label="Symbol" value={asset.symbol} /><InfoRow icon={asset.type === 'native' ? Globe : Layers} label="Type" value={asset.type === 'native' ? 'Native cryptocurrency' : asset.type === 'jetton' ? 'Jetton / Token' : asset.type === 'spl' ? 'Solana Token' : asset.type === 'bep20' ? 'BEP-20 Token' : asset.type === 'erc20' ? 'ERC-20 Token' : 'Simulated'} /><InfoRow icon={positive ? TrendingUp : TrendingDown} label="Price" value={marketService.formatPrice(asset.priceUsd)} valueClass={positive ? 'text-nova-success' : 'text-nova-error'} /><InfoRow icon={positive ? TrendingUp : TrendingDown} label="24h Change" value={marketService.formatPct(asset.change24h)} valueClass={positive ? 'text-nova-success' : 'text-nova-error'} /></Card></div>
        {asset.id === 'AQV' && (<div className="mt-4 space-y-2.5"><h3 className="font-display text-sm font-semibold text-nova-muted">Launch Info</h3><Card className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nova-accent to-nova-accent-2"><Rocket className="h-5 w-5 text-white" /></div><div className="flex-1"><p className="text-sm font-semibold">Pump.fun</p><p className="text-xs text-nova-muted">Solana Launch Platform</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${asset.launchStatus === 'live' ? 'bg-nova-success/15 text-nova-success' : 'bg-nova-warning/15 text-nova-warning'}`}>{asset.launchStatus === 'live' ? 'LIVE' : 'PRE-LAUNCH'}</span></div>{asset.officialMintAddress ? (<div className="mt-3 rounded-xl bg-nova-surface-2 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-nova-dim">Official Mint Address</p><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate font-mono text-xs">{asset.officialMintAddress}</span><button onClick={() => { navigator.clipboard?.writeText(asset.officialMintAddress ?? ''); setMintCopied(true); haptic('light'); setTimeout(() => setMintCopied(false), 2000); }} className="shrink-0 text-nova-dim transition-colors hover:text-nova-accent">{mintCopied ? <Check className="h-3.5 w-3.5 text-nova-success" /> : <Copy className="h-3.5 w-3.5" />}</button></div></div>) : <p className="mt-3 text-[11px] leading-relaxed text-nova-muted">The official AQV Solana mint address will appear here once the token is created on Pump.fun. Do not trust any AQV address from third parties.</p>}</Card></div>)}
        {assetTxs.length > 0 && (<div className="mt-6"><h3 className="mb-2.5 font-display text-sm font-semibold text-nova-muted">Recent Activity</h3><Card className="overflow-hidden"><div className="divide-y divide-nova-border">{assetTxs.map((tx) => <TxRow key={tx.id} tx={tx} onClick={() => navigate({ name: 'transaction', txId: tx.id })} />)}</div></Card></div>)}
        <div className="mt-4"><Button variant="secondary" fullWidth onClick={() => { haptic('light'); navigate({ name: 'swap-detail' }); }}><ArrowLeftRight className="mr-1.5 inline h-4 w-4" />Swap {asset.symbol}</Button></div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, valueClass = '' }: { icon: typeof Globe; label: string; value: string; valueClass?: string }) {
  return (<div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-2.5"><Icon className="h-4 w-4 text-nova-dim" /><span className="text-sm text-nova-muted">{label}</span></div><span className={`text-sm font-medium ${valueClass}`}>{value}</span></div>);
}
