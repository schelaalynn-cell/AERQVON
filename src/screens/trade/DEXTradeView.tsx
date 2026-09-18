import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { marketService } from '@/services/marketService';
import { dexTradingService } from '@/services/dexTradingService';
import { walletService } from '@/services/walletService';
import { useApp } from '@/context/AppContext';
import { useUi } from '@/hooks/useUi';
import type { AssetId, DexQuote } from '@/types';
import { ArrowDown, Settings2, CheckCircle2, RefreshCw, Wallet, Droplets, Route, AlertCircle, X } from 'lucide-react';

const SWAP_ASSETS: AssetId[] = ['AQV', 'SOL', 'USDC', 'USDT', 'BNB', 'ETH'];

export function DEXTradeView() {
  const { assets, balances, executeDexSwap, dexTransactions } = useApp();
  const { haptic, hapticNotify } = useUi();
  const [fromAssetId, setFromAssetId] = useState<AssetId>('AQV');
  const [toAssetId, setToAssetId] = useState<AssetId>('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const fromAsset = assets.find((a) => a.id === fromAssetId) ?? assets[0];
  const toAsset = assets.find((a) => a.id === toAssetId) ?? assets[1];
  const fromBalance = balances.find((b) => b.assetId === fromAssetId);
  const numericAmount = parseFloat(amount) || 0;
  const quote: DexQuote | null = numericAmount > 0 ? dexTradingService.getQuote(fromAssetId, toAssetId, numericAmount, slippage) : null;
  const route = dexTradingService.getRoute(fromAssetId, toAssetId);
  const liquidityUsd = dexTradingService.getLiquidityForPair(fromAssetId, toAssetId);
  const totalLiquidity = dexTradingService.getTotalLiquidity();
  const walletAddress = walletService.getWallet().address;

  const handleSwapAssets = () => { haptic('medium'); setFromAssetId(toAssetId); setToAssetId(fromAssetId); setAmount(''); setError(''); };
  const handleConfirmOpen = () => {
    setError(''); setSuccess(false); haptic('medium');
    if (numericAmount <= 0) { setError('Enter a valid amount'); hapticNotify('error'); return; }
    if (!fromBalance || numericAmount > fromBalance.amount) { setError(`Insufficient ${fromAsset.symbol} balance`); hapticNotify('error'); return; }
    if (!quote) { setError('Could not get a quote for this pair'); hapticNotify('error'); return; }
    setShowConfirm(true);
  };
  const handleConfirmExecute = () => {
    haptic('medium'); setShowConfirm(false); setExecuting(true);
    setTimeout(() => { const result = executeDexSwap(fromAssetId, toAssetId, numericAmount, slippage); setExecuting(false); if (result) { hapticNotify('success'); setSuccess(true); setAmount(''); setTimeout(() => setSuccess(false), 4000); } else { setError('Swap failed — check your balance and try again'); hapticNotify('error'); } }, 1500);
  };
  const insufficientBalance = fromBalance ? numericAmount > fromBalance.amount : true;
  const canExecute = numericAmount > 0 && quote !== null && !insufficientBalance && !executing;

  return (
    <div className="space-y-3">
      <Card className="flex items-center justify-between p-4"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-aerqvon-accent/15"><Wallet className="h-4 w-4 text-aerqvon-accent" /></div><div><p className="text-sm font-semibold">Solana Wallet</p><p className="text-[10px] text-aerqvon-dim">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</p></div></div><span className="rounded-lg bg-aerqvon-success/15 px-2.5 py-1 text-[10px] font-semibold text-aerqvon-success">Connected</span></Card>
      <Card className="p-4" glow><div className="mb-2 flex items-center justify-between"><span className="text-xs text-aerqvon-muted">From</span><button onClick={() => { haptic('light'); setAmount(String(fromBalance?.amount ?? 0)); }} className="text-xs text-aerqvon-muted">Balance: {marketService.formatAmount(fromBalance?.amount ?? 0, fromAsset.decimals)} {fromAsset.symbol}</button></div><div className="flex items-center gap-3"><input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="0.00" className="flex-1 bg-transparent font-display text-2xl font-bold outline-none placeholder:text-aerqvon-dim" /><SwapAssetSelector asset={fromAsset} assets={assets} onSelect={(id) => { haptic('light'); setFromAssetId(id); }} /></div><p className="mt-1 text-xs text-aerqvon-muted">≈ {marketService.formatUsd(numericAmount * fromAsset.priceUsd)}</p></Card>
      <div className="relative -my-3 flex justify-center"><button onClick={handleSwapAssets} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-aerqvon-border bg-aerqvon-surface text-aerqvon-accent transition-all active:scale-90 hover:rotate-180 duration-300"><ArrowDown className="h-5 w-5" /></button></div>
      <Card className="p-4"><div className="mb-2 flex items-center justify-between"><span className="text-xs text-aerqvon-muted">To (estimated)</span></div><div className="flex items-center gap-3"><div className="flex-1 font-display text-2xl font-bold text-aerqvon-muted">{quote ? marketService.formatAmount(quote.toAmount, toAsset.decimals) : '0.00'}</div><SwapAssetSelector asset={toAsset} assets={assets} onSelect={(id) => { haptic('light'); setToAssetId(id); }} /></div><p className="mt-1 text-xs text-aerqvon-muted">≈ {marketService.formatUsd((quote?.toAmount ?? 0) * toAsset.priceUsd)}</p></Card>
      <div className="flex justify-end"><button onClick={() => { haptic('light'); setShowSettings((v) => !v); }} className="flex items-center gap-1.5 rounded-lg bg-aerqvon-surface-2 px-3 py-1.5 text-xs font-medium text-aerqvon-muted transition-colors"><Settings2 className="h-3.5 w-3.5" />Slippage: {slippage}%</button></div>
      {showSettings && <Card className="p-4 animate-scale-in"><p className="mb-3 text-sm font-medium">Slippage Tolerance</p><div className="flex gap-2">{[0.1, 0.5, 1.0, 3.0].map((s) => <button key={s} onClick={() => { haptic('light'); setSlippage(s); }} className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${slippage === s ? 'bg-aerqvon-accent text-white' : 'bg-aerqvon-surface-2 text-aerqvon-muted'}`}>{s}%</button>)}</div></Card>}
      {route.hops > 0 && <Card className="p-4"><div className="flex items-center gap-2"><Route className="h-4 w-4 text-aerqvon-accent" /><p className="text-xs font-semibold text-aerqvon-muted">Routing</p></div><div className="mt-2 flex items-center gap-2 text-sm">{route.path.map((token, i) => <span key={i} className="flex items-center gap-2">{i > 0 && <span className="text-aerqvon-dim">→</span>}<span className="rounded-lg bg-aerqvon-surface-2 px-2 py-1 text-xs font-medium">{token}</span></span>)}</div><p className="mt-2 text-[10px] text-aerqvon-dim">{route.hops === 1 ? 'Direct pool' : `${route.hops} hops via intermediate pool`}</p></Card>}
      {quote && <Card className="divide-y divide-aerqvon-border animate-fade-in"><SwapQuoteRow label="Exchange rate" value={`1 ${fromAsset.symbol} = ${marketService.formatAmount(quote.exchangeRate, 6)} ${toAsset.symbol}`} /><SwapQuoteRow label="Price impact" value={`~${quote.priceImpact.toFixed(2)}%`} /><SwapQuoteRow label="Minimum received" value={`${marketService.formatAmount(quote.minReceived, toAsset.decimals)} ${toAsset.symbol}`} /><SwapQuoteRow label="Slippage" value={`${slippage}%`} /><SwapQuoteRow label="Network fee" value={`${quote.networkFee} SOL`} /><SwapQuoteRow label="Liquidity" value={`$${marketService.formatCompact(quote.liquidityUsd)}`} /></Card>}
      <Card className="p-4"><div className="flex items-center gap-2"><Droplets className="h-4 w-4 text-aerqvon-accent" /><p className="text-xs font-semibold text-aerqvon-muted">Liquidity Pools</p></div><div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div><p className="text-[10px] text-aerqvon-dim">Pool Liquidity</p><p className="font-semibold">${marketService.formatCompact(liquidityUsd)}</p></div><div><p className="text-[10px] text-aerqvon-dim">Total TVL</p><p className="font-semibold">${marketService.formatCompact(totalLiquidity)}</p></div></div></Card>
      {error && <Card className="border-aerqvon-error/20 bg-aerqvon-error/5 p-3"><p className="text-center text-sm text-aerqvon-error">{error}</p></Card>}
      {success && <Card className="border-aerqvon-success/20 bg-aerqvon-success/5 p-4 animate-scale-in"><div className="flex items-center gap-2 text-aerqvon-success"><CheckCircle2 className="h-5 w-5" /><span className="text-sm font-medium">Swap confirmed</span></div></Card>}
      <Button fullWidth size="lg" disabled={!canExecute} onClick={handleConfirmOpen} className="bg-aerqvon-accent">{executing ? <><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Swapping...</> : insufficientBalance ? 'Insufficient Balance' : `Swap ${fromAsset.symbol} → ${toAsset.symbol}`}</Button>
      <p className="text-center text-[10px] text-aerqvon-dim">Demo mode: routing and liquidity are not connected to live Solana pools.</p>
      {dexTransactions.length > 0 && <div><h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-aerqvon-dim">Swap History</h3><Card className="divide-y divide-aerqvon-border">{dexTransactions.slice(0, 10).map((tx) => <div key={tx.id} className="px-4 py-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm font-medium">{tx.fromAssetId} → {tx.toAssetId}</span></div><span className={`text-[10px] font-semibold ${tx.status === 'confirmed' ? 'text-aerqvon-success' : tx.status === 'failed' ? 'text-aerqvon-error' : 'text-aerqvon-warning'}`}>{tx.status}</span></div><div className="mt-1 flex justify-between text-[10px] text-aerqvon-dim"><span>{tx.fromAmount.toFixed(4)} → {tx.toAmount.toFixed(4)}</span><span>{marketService.formatTimeAgo(tx.timestamp)}</span></div><div className="mt-0.5 flex items-center gap-2 text-[10px] text-aerqvon-dim"><span>Route: {tx.route.path.join(' → ')}</span><span>Fee: {tx.networkFee} SOL</span></div></div>)}</Card></div>}
      {showConfirm && quote && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-fade-in" onClick={() => setShowConfirm(false)}><div className="w-full max-w-md rounded-t-3xl bg-aerqvon-surface border-t border-aerqvon-border p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Confirm Swap</h3><button onClick={() => setShowConfirm(false)} className="text-aerqvon-dim"><X className="h-5 w-5" /></button></div><div className="mb-4 flex items-center justify-center gap-3"><div className="flex items-center gap-2 rounded-xl bg-aerqvon-surface-2 px-3 py-2"><AssetIcon asset={fromAsset} size={24} /><span className="text-sm font-semibold">{numericAmount.toFixed(4)}</span><span className="text-xs text-aerqvon-dim">{fromAsset.symbol}</span></div><ArrowDown className="h-4 w-4 text-aerqvon-accent" /><div className="flex items-center gap-2 rounded-xl bg-aerqvon-surface-2 px-3 py-2"><AssetIcon asset={toAsset} size={24} /><span className="text-sm font-semibold">{quote.toAmount.toFixed(4)}</span><span className="text-xs text-aerqvon-dim">{toAsset.symbol}</span></div></div><div className="space-y-2 rounded-xl bg-aerqvon-surface-2/50 p-4 text-sm"><div className="flex justify-between"><span className="text-aerqvon-dim">Route</span><span className="font-medium">{quote.route.path.join(' → ')}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Price impact</span><span className="font-medium">~{quote.priceImpact.toFixed(2)}%</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Min received</span><span className="font-medium">{quote.minReceived.toFixed(4)} {toAsset.symbol}</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Slippage</span><span className="font-medium">{slippage}%</span></div><div className="flex justify-between"><span className="text-aerqvon-dim">Network fee</span><span className="font-medium">{quote.networkFee} SOL</span></div></div><div className="mt-3 flex items-start gap-2 rounded-lg bg-aerqvon-warning/10 p-3"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-warning" /><p className="text-[11px] text-aerqvon-muted">Demo mode: no real on-chain transaction will occur.</p></div><div className="mt-4 flex gap-2"><Button variant="secondary" fullWidth onClick={() => setShowConfirm(false)}>Cancel</Button><Button fullWidth onClick={handleConfirmExecute} className="bg-aerqvon-accent">Confirm Swap</Button></div></div></div>}
    </div>
  );
}

function SwapAssetSelector({ asset, assets, onSelect }: { asset: { symbol: string; color: string }; assets: { id: string; symbol: string; color: string }[]; onSelect: (id: AssetId) => void }) {
  const [open, setOpen] = useState(false);
  const swapAssets = assets.filter((a) => SWAP_ASSETS.includes(a.id as AssetId));
  return (
    <div className="relative"><button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-xl bg-aerqvon-surface-2 px-3 py-2 transition-all active:scale-95"><AssetIcon asset={asset} size={28} /><span className="font-semibold">{asset.symbol}</span></button>{open && <Card className="absolute right-0 top-12 z-50 overflow-hidden animate-scale-in">{swapAssets.map((a) => <button key={a.id} onClick={() => { onSelect(a.id as AssetId); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-aerqvon-surface-2/50 active:bg-aerqvon-surface-2"><AssetIcon asset={a} size={24} /><span className="text-sm font-medium">{a.symbol}</span></button>)}</Card>}</div>
  );
}

function SwapQuoteRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="text-aerqvon-muted">{label}</span><span className="font-medium">{value}</span></div>;
}
