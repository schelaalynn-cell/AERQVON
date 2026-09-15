import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { walletService } from '@/services/walletService';
import { marketService } from '@/services/marketService';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { DemoBadge } from '@/components/DemoBadge';
import { Check, AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';

type Step = 'asset' | 'network' | 'address' | 'amount' | 'review' | 'confirm' | 'done';
const FEE = 0.05;

export function SendScreen({ assetId }: { assetId?: string }) {
  const { assets, balances, sendTransaction } = useApp();
  const { goBack } = useRouter();
  const { haptic, hapticNotify } = useUi();
  const [step, setStep] = useState<Step>(assetId ? 'network' : 'asset');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assetId ?? 'GRAM');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const asset = assets.find((a) => a.id === selectedAssetId) ?? assets[0];
  const balance = balances.find((b) => b.assetId === selectedAssetId);
  const network = walletService.getNetwork(asset.networkId);
  const numericAmount = parseFloat(amount) || 0;
  const total = numericAmount + FEE;
  const stepOrder: Step[] = ['asset', 'network', 'address', 'amount', 'review', 'confirm', 'done'];
  const stepIndex = stepOrder.indexOf(step);

  const handleNext = () => {
    haptic('light'); setError('');
    if (step === 'asset') setStep('network');
    else if (step === 'network') setStep('address');
    else if (step === 'address') { if (!walletService.isValidAddress(recipient, asset.networkId)) { setError('Please enter a valid address'); hapticNotify('error'); return; } setStep('amount'); }
    else if (step === 'amount') { if (numericAmount <= 0) { setError('Enter an amount greater than 0'); hapticNotify('error'); return; } if (total > (balance?.amount ?? 0)) { setError('Insufficient balance'); hapticNotify('error'); return; } setStep('review'); }
    else if (step === 'review') setStep('confirm');
    else if (step === 'confirm') { const tx = sendTransaction({ assetId: asset.id, assetSymbol: asset.symbol, networkId: asset.networkId, amount: numericAmount, recipient, fee: FEE }); setTxHash(tx.txHash); hapticNotify('success'); setStep('done'); }
  };

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-nova-success/15 animate-pop"><CheckCircle2 className="h-10 w-10 text-nova-success" /></div>
          <h2 className="font-display text-2xl font-bold">Demo Transaction Created</h2>
          <p className="mt-2 text-sm text-nova-muted">Your transaction has been simulated successfully.</p>
          <Card className="mt-6 p-4 text-left"><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-nova-muted">Amount</span><span className="font-medium">{marketService.formatAmount(numericAmount, asset.decimals)} {asset.symbol}</span></div><div className="flex justify-between"><span className="text-nova-muted">Recipient</span><span className="font-mono text-xs">{recipient.slice(0, 8)}...{recipient.slice(-6)}</span></div><div className="flex justify-between"><span className="text-nova-muted">Network fee</span><span className="font-medium">{FEE} GRAM</span></div><div className="flex justify-between"><span className="text-nova-muted">Tx ID</span><span className="font-mono text-xs">{txHash.slice(0, 12)}...</span></div></div></Card>
          <Card className="mt-3 border-nova-warning/20 bg-nova-warning/5 p-3"><p className="text-center text-xs text-nova-warning">Not broadcast to the blockchain.</p></Card>
          <Button fullWidth size="lg" className="mt-6" onClick={() => goBack()}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title="Send" subtitle={`Step ${stepIndex + 1} of 6`} />
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-6 flex gap-1.5">{stepOrder.slice(0, 6).map((s, i) => (<div key={s} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= stepIndex ? 'bg-nova-accent' : 'bg-nova-surface-3'}`} />))}</div>
        {step === 'asset' && (<div className="space-y-2.5 animate-fade-in"><h2 className="mb-3 font-display text-lg font-semibold">Select Asset</h2>{assets.map((a) => { const b = balances.find((bal) => bal.assetId === a.id); return (<Card key={a.id} onClick={() => { haptic('light'); setSelectedAssetId(a.id); }} className="p-3.5"><div className="flex items-center gap-3"><div className="relative"><AssetIcon asset={a} size={40} />{a.isSimulated && <span className="absolute -bottom-1 -right-1 rounded-full bg-nova-bg px-1 py-0.5 text-[7px] font-bold uppercase text-nova-warning">Sim</span>}</div><div className="flex-1"><p className="font-medium">{a.name}</p><p className="text-xs text-nova-muted">{marketService.formatAmount(b?.amount ?? 0, a.decimals)} {a.symbol}</p></div>{a.id === selectedAssetId && <Check className="h-5 w-5 text-nova-accent" />}</div></Card>); })}</div>)}
        {step === 'network' && (<div className="space-y-2.5 animate-fade-in"><h2 className="mb-3 font-display text-lg font-semibold">Select Network</h2><Card className="p-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-nova-accent/15"><span className="font-bold text-nova-accent">{network?.shortName}</span></div><div className="flex-1"><p className="font-medium">{network?.name}</p><p className="text-xs text-nova-muted">{asset.type === 'native' ? 'Native cryptocurrency' : asset.type === 'jetton' ? 'Jetton token' : asset.type === 'spl' ? 'Solana token' : asset.type === 'bep20' ? 'BEP-20 token' : asset.type === 'erc20' ? 'ERC-20 token' : 'Simulated asset'}</p></div><Check className="h-5 w-5 text-nova-accent" /></div></Card><Card className="border-nova-warning/20 bg-nova-warning/5 p-4"><div className="flex items-start gap-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-nova-warning" /><p className="text-xs text-nova-muted">Sending {asset.name} ({asset.symbol}) on the {network?.name} network. Make sure the recipient supports this network.</p></div></Card></div>)}
        {step === 'address' && (<div className="space-y-4 animate-fade-in"><h2 className="font-display text-lg font-semibold">Recipient Address</h2><div><label className="mb-1.5 block text-xs font-medium text-nova-muted">{network?.shortName} address</label><textarea value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Enter recipient address" rows={3} className="w-full resize-none rounded-xl bg-nova-surface border border-nova-border px-4 py-3 text-sm font-mono outline-none transition-colors focus:border-nova-accent" />{error && <p className="mt-2 text-xs text-nova-error">{error}</p>}</div><Card className="p-4"><div className="flex items-center gap-3"><AssetIcon asset={asset} size={36} /><div><p className="text-sm font-medium">{asset.name}</p><p className="text-xs text-nova-muted">{network?.name}</p></div></div></Card></div>)}
        {step === 'amount' && (<div className="space-y-4 animate-fade-in"><h2 className="font-display text-lg font-semibold">Enter Amount</h2><Card className="p-6" glow><div className="text-center"><div className="mb-2 flex items-center justify-center gap-2"><AssetIcon asset={asset} size={28} /><span className="text-sm text-nova-muted">{asset.symbol}</span></div><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus className="w-full bg-transparent text-center font-display text-4xl font-bold outline-none placeholder:text-nova-dim" /><p className="mt-1 text-sm text-nova-muted">≈ {marketService.formatUsd(numericAmount * asset.priceUsd)}</p></div><div className="mt-4 flex items-center justify-between rounded-xl bg-nova-surface-2 px-4 py-2.5"><span className="text-xs text-nova-muted">Available</span><span className="text-sm font-medium">{marketService.formatAmount(balance?.amount ?? 0, asset.decimals)} {asset.symbol}</span></div><div className="mt-2 flex gap-2">{['25%', '50%', 'Max'].map((pct) => (<button key={pct} onClick={() => { haptic('light'); const bal = balance?.amount ?? 0; const val = pct === 'Max' ? Math.max(0, bal - FEE) : bal * (parseInt(pct) / 100); setAmount(val.toFixed(asset.decimals > 6 ? 6 : 2)); }} className="flex-1 rounded-lg bg-nova-surface-3 py-1.5 text-xs font-medium transition-transform active:scale-95">{pct}</button>))}</div></Card>{error && <p className="text-xs text-nova-error">{error}</p>}<div className="flex items-center justify-between rounded-xl bg-nova-surface border border-nova-border px-4 py-3 text-sm"><span className="text-nova-muted">Network fee</span><span className="font-medium">{FEE} GRAM</span></div></div>)}
        {step === 'review' && (<div className="space-y-4 animate-fade-in"><h2 className="font-display text-lg font-semibold">Review</h2><Card className="p-5" glow><div className="flex items-center gap-3 border-b border-nova-border pb-4"><AssetIcon asset={asset} size={44} /><div><p className="font-semibold">{marketService.formatAmount(numericAmount, asset.decimals)} {asset.symbol}</p><p className="text-xs text-nova-muted">≈ {marketService.formatUsd(numericAmount * asset.priceUsd)}</p></div></div><div className="space-y-3 pt-4 text-sm"><ReviewRow label="Recipient" value={`${recipient.slice(0, 10)}...${recipient.slice(-8)}`} mono /><ReviewRow label="Amount" value={`${marketService.formatAmount(numericAmount, asset.decimals)} ${asset.symbol}`} /><ReviewRow label="Network" value={network?.name ?? asset.networkName} /><ReviewRow label="Network fee" value={`${FEE} GRAM`} /><div className="border-t border-nova-border pt-3"><ReviewRow label="Total" value={`${marketService.formatAmount(total, asset.decimals)} ${asset.symbol}`} bold /></div><ReviewRow label="Estimated arrival" value="~ 5 seconds" /></div></Card><Card className="border-nova-warning/20 bg-nova-warning/5 p-4"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-nova-warning" /><p className="text-xs text-nova-muted">Demo mode: this transaction will be simulated and not broadcast to the blockchain.</p></div></Card></div>)}
        {step === 'confirm' && (<div className="flex flex-col items-center pt-8 animate-scale-in"><div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-nova-accent/15"><ArrowRight className="h-10 w-10 text-nova-accent" /></div><h2 className="font-display text-xl font-bold">Confirm Transaction</h2><p className="mt-2 text-center text-sm text-nova-muted">You are sending {marketService.formatAmount(numericAmount, asset.decimals)} {asset.symbol} on {network?.name}</p><Card className="mt-6 w-full p-4"><div className="space-y-2 text-sm"><ReviewRow label="To" value={`${recipient.slice(0, 10)}...${recipient.slice(-8)}`} mono /><ReviewRow label="Amount" value={`${marketService.formatAmount(numericAmount, asset.decimals)} ${asset.symbol}`} /><ReviewRow label="Fee" value={`${FEE} GRAM`} /><div className="border-t border-nova-border pt-2"><ReviewRow label="Total" value={`${marketService.formatAmount(total, asset.decimals)} ${asset.symbol}`} bold /></div></div></Card><DemoBadge className="mt-4" /></div>)}
        <div className="mt-6 flex gap-3"><Button variant="secondary" size="lg" onClick={() => { haptic('light'); goBack(); }}>Back</Button><Button size="lg" fullWidth onClick={handleNext}>{step === 'confirm' ? 'Confirm & Send' : 'Continue'}{step === 'confirm' ? null : <ArrowRight className="ml-2 inline h-4 w-4" />}</Button></div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono = false, bold = false }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (<div className="flex items-center justify-between"><span className="text-nova-muted">{label}</span><span className={`${mono ? 'font-mono text-xs' : ''} ${bold ? 'font-bold text-base' : 'font-medium'}`}>{value}</span></div>);
}
