import { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useUi } from '@/hooks/useUi';
import { swapService } from '@/services/swapService';
import { marketService } from '@/services/marketService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { DemoBadge } from '@/components/DemoBadge';
import { ArrowDown, Settings2, CheckCircle2, RefreshCw } from 'lucide-react';
import type { Asset, AssetId, SwapQuote } from '@/types';

const SWAP_ASSETS: AssetId[] = ['AQV', 'BNB', 'USDC', 'USDT', 'ETH'];

export function SwapScreen() {
  const { assets, balances, executeSwap } = useApp();
  const { haptic, hapticNotify } = useUi();
  const [fromAssetId, setFromAssetId] = useState<AssetId>('AQV');
  const [toAssetId, setToAssetId] = useState<AssetId>('USDC');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [success, setSuccess] = useState(false);

  const fromAsset = assets.find((a) => a.id === fromAssetId) ?? assets[0];
  const toAsset = assets.find((a) => a.id === toAssetId) ?? assets[1];
  const fromBalance = balances.find((b) => b.assetId === fromAssetId);
  const numericAmount = parseFloat(amount) || 0;

  useEffect(() => {
    if (numericAmount > 0) {
      const q = swapService.getQuote(fromAssetId, toAssetId, numericAmount);
      setQuote(q);
    } else {
      setQuote(null);
    }
  }, [fromAssetId, toAssetId, amount, numericAmount]);

  const handleSwapAssets = () => {
    haptic('medium');
    setFromAssetId(toAssetId);
    setToAssetId(fromAssetId);
    setAmount('');
    setQuote(null);
  };

  const handleExecute = () => {
    haptic('medium');
    setExecuting(true);
    setTimeout(() => {
      const result = executeSwap(fromAssetId, toAssetId, numericAmount);
      setExecuting(false);
      if (result) {
        hapticNotify('success');
        setSuccess(true);
        setAmount('');
        setQuote(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        hapticNotify('error');
      }
    }, 1200);
  };

  const insufficientBalance = fromBalance ? numericAmount + (quote?.networkFee ?? 0) > fromBalance.amount : true;
  const canExecute = numericAmount > 0 && quote !== null && !insufficientBalance && !executing;

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-2 safe-top">
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Swap</h1>
            <div className="flex items-center gap-2">
              <DemoBadge />
              <button onClick={() => { haptic('light'); setShowSettings((v) => !v); }} className="flex h-9 w-9 items-center justify-center rounded-xl bg-aerqvon-surface border border-aerqvon-border transition-transform active:scale-90">
                <Settings2 className="h-4 w-4 text-aerqvon-muted" />
              </button>
            </div>
          </div>
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-aerqvon-accent-2/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-aerqvon-accent-2">Demo Swap</div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <Card className="p-4" glow>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-aerqvon-muted">From</span>
            <button onClick={() => { haptic('light'); setAmount(String(fromBalance?.amount ?? 0)); }} className="text-xs text-aerqvon-muted">
              Balance: {marketService.formatAmount(fromBalance?.amount ?? 0, fromAsset.decimals)} {fromAsset.symbol}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="flex-1 bg-transparent font-display text-2xl font-bold outline-none placeholder:text-aerqvon-dim" />
            <AssetSelector asset={fromAsset} onSelect={(id) => { haptic('light'); setFromAssetId(id); }} />
          </div>
          <p className="mt-1 text-xs text-aerqvon-muted">≈ {marketService.formatUsd(numericAmount * fromAsset.priceUsd)}</p>
        </Card>

        <div className="relative -my-3 flex justify-center">
          <button onClick={handleSwapAssets} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-aerqvon-border bg-aerqvon-surface text-aerqvon-accent transition-all active:scale-90 hover:rotate-180 duration-300">
            <ArrowDown className="h-5 w-5" />
          </button>
        </div>

        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-aerqvon-muted">To (estimated)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 font-display text-2xl font-bold text-aerqvon-muted">{quote ? marketService.formatAmount(quote.toAmount, toAsset.decimals) : '0.00'}</div>
            <AssetSelector asset={toAsset} onSelect={(id) => { haptic('light'); setToAssetId(id); }} />
          </div>
          <p className="mt-1 text-xs text-aerqvon-muted">≈ {marketService.formatUsd((quote?.toAmount ?? 0) * toAsset.priceUsd)}</p>
        </Card>

        {showSettings && (
          <Card className="mt-3 p-4 animate-scale-in">
            <p className="mb-3 text-sm font-medium">Slippage Tolerance</p>
            <div className="flex gap-2">
              {[0.1, 0.5, 1.0, 3.0].map((s) => (
                <button key={s} onClick={() => { haptic('light'); setSlippage(s); }} className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${slippage === s ? 'bg-aerqvon-accent text-white' : 'bg-aerqvon-surface-2 text-aerqvon-muted'}`}>{s}%</button>
              ))}
            </div>
          </Card>
        )}

        {quote && (
          <Card className="mt-3 divide-y divide-aerqvon-border animate-fade-in">
            <QuoteRow label="Exchange rate" value={`1 ${fromAsset.symbol} = ${marketService.formatAmount(quote.exchangeRate, 6)} ${toAsset.symbol}`} />
            <QuoteRow label="Network fee" value={`${quote.networkFee} ${quote.feeAsset}`} />
            <QuoteRow label="Slippage" value={`${slippage}%`} />
            <QuoteRow label="Minimum received" value={`${marketService.formatAmount(quote.minReceived, toAsset.decimals)} ${toAsset.symbol}`} />
            <QuoteRow label="Price impact" value={`~${quote.priceImpact.toFixed(2)}%`} />
          </Card>
        )}

        {insufficientBalance && numericAmount > 0 && (
          <Card className="mt-3 border-aerqvon-error/20 bg-aerqvon-error/5 p-3">
            <p className="text-center text-sm text-aerqvon-error">Insufficient balance</p>
          </Card>
        )}

        {success && (
          <Card className="mt-3 border-aerqvon-success/20 bg-aerqvon-success/5 p-4 animate-scale-in">
            <div className="flex items-center gap-2 text-aerqvon-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Swap executed (demo)</span>
            </div>
          </Card>
        )}

        <Button fullWidth size="lg" className="mt-4" disabled={!canExecute} onClick={handleExecute}>
          {executing ? (<><RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />Swapping...</>) : insufficientBalance ? 'Insufficient Balance' : `Swap ${fromAsset.symbol} → ${toAsset.symbol}`}
        </Button>

        <p className="mt-3 text-center text-[10px] text-aerqvon-dim">Demo swap — simulated rates only. No real funds will move.</p>
      </div>
    </div>
  );
}

function AssetSelector({ asset, onSelect }: { asset: Asset; onSelect: (id: AssetId) => void }) {
  const [open, setOpen] = useState(false);
  const { assets } = useApp();
  const swapAssets = assets.filter((a) => SWAP_ASSETS.includes(a.id));

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-xl bg-aerqvon-surface-2 px-3 py-2 transition-all active:scale-95">
        <AssetIcon asset={asset} size={28} />
        <span className="font-semibold">{asset.symbol}</span>
      </button>
      {open && (
        <Card className="absolute right-0 top-12 z-50 overflow-hidden animate-scale-in">
          {swapAssets.map((a) => (
            <button key={a.id} onClick={() => { onSelect(a.id); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2.5 transition-colors hover:bg-aerqvon-surface-2/50 active:bg-aerqvon-surface-2">
              <AssetIcon asset={a} size={24} />
              <span className="text-sm font-medium">{a.symbol}</span>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function QuoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-aerqvon-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
