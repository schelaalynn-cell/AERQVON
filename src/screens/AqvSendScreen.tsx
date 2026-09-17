import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { marketService } from '@/services/marketService';
import { transferTokensByAqvId } from '@/services/aqvTransferService';
import { fetchBalancesFromDb } from '@/services/dbSyncService';
import { walletService } from '@/services/walletService';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { CheckCircle2, AlertTriangle, ArrowRight, UserRound } from 'lucide-react';

export function AqvSendScreen({ assetId }: { assetId?: string }) {
  const { assets, balances, refresh } = useApp();
  const { goBack } = useRouter();
  const { haptic, hapticNotify } = useUi();
  const [selectedAssetId, setSelectedAssetId] = useState(assetId ?? 'GRAM');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completedId, setCompletedId] = useState('');

  const asset = assets.find((a) => a.id === selectedAssetId) ?? assets[0];
  const balance = useMemo(() => balances.find((b) => b.assetId === selectedAssetId)?.amount ?? 0, [balances, selectedAssetId]);
  const numericAmount = Number(amount);

  async function submit() {
    setError('');
    const aqvId = recipient.trim().toUpperCase();
    if (!/^AQV-[A-Z0-9]{8}$/.test(aqvId)) {
      setError('Enter a valid AERQVON User ID such as AQV-XXXXXXXX.');
      hapticNotify('error');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.');
      hapticNotify('error');
      return;
    }
    if (numericAmount > balance) {
      setError('Insufficient available balance.');
      hapticNotify('error');
      return;
    }

    setBusy(true);
    try {
      const result = await transferTokensByAqvId({
        recipientAqvUserId: aqvId,
        assetId: selectedAssetId,
        amount: numericAmount,
        note,
      });
      const fresh = await fetchBalancesFromDb();
      if (fresh) {
        for (const [id, value] of fresh) walletService.setBalance(id, value);
      }
      refresh();
      setCompletedId(result.id);
      hapticNotify('success');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Transfer failed.';
      setError(message);
      hapticNotify('error');
    } finally {
      setBusy(false);
    }
  }

  if (completedId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-nova-success/15">
            <CheckCircle2 className="h-10 w-10 text-nova-success" />
          </div>
          <h2 className="font-display text-2xl font-bold">Transfer Complete</h2>
          <p className="mt-2 text-sm text-nova-muted">The tokens were transferred to {recipient.trim().toUpperCase()}.</p>
          <Card className="mt-6 p-4 text-left">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-nova-muted">Amount</span><span className="font-medium">{marketService.formatAmount(numericAmount, asset.decimals)} {asset.symbol}</span></div>
              <div className="flex justify-between"><span className="text-nova-muted">Recipient</span><span className="font-mono text-xs">{recipient.trim().toUpperCase()}</span></div>
              <div className="flex justify-between"><span className="text-nova-muted">Network fee</span><span className="font-medium">0 {asset.symbol}</span></div>
              <div className="flex justify-between"><span className="text-nova-muted">Transfer ID</span><span className="font-mono text-xs">{completedId.slice(0, 12)}...</span></div>
            </div>
          </Card>
          <Button fullWidth size="lg" className="mt-6" onClick={goBack}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title="Send to AERQVON User" subtitle="Transfer tokens by AQV User ID" />
      <div className="mx-auto max-w-md px-4 pt-4 space-y-4">
        <Card className="p-4 border-nova-accent/20 bg-nova-accent/5">
          <div className="flex items-start gap-3">
            <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-nova-accent" />
            <div>
              <p className="font-medium">Use the recipient's AQV ID</p>
              <p className="mt-1 text-xs text-nova-muted">No wallet address is required. AERQVON performs the transfer inside its account ledger.</p>
            </div>
          </div>
        </Card>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-nova-muted">Recipient AQV User ID</label>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value.toUpperCase())} placeholder="AQV-XXXXXXXX" maxLength={12} className="w-full rounded-xl bg-nova-surface border border-nova-border px-4 py-3 font-mono text-sm uppercase outline-none focus:border-nova-accent" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-nova-muted">Token</label>
          <div className="space-y-2">
            {assets.map((a) => {
              const b = balances.find((item) => item.assetId === a.id);
              return (
                <Card key={a.id} onClick={() => { setSelectedAssetId(a.id); haptic('light'); }} className={`p-3.5 ${selectedAssetId === a.id ? 'border-nova-accent/50' : ''}`}>
                  <div className="flex items-center gap-3">
                    <AssetIcon asset={a} size={38} />
                    <div className="flex-1"><p className="font-medium">{a.symbol}</p><p className="text-xs text-nova-muted">{marketService.formatAmount(b?.amount ?? 0, a.decimals)} available</p></div>
                    {selectedAssetId === a.id && <ArrowRight className="h-4 w-4 text-nova-accent" />}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-nova-muted">Amount</label>
          <div className="rounded-xl bg-nova-surface border border-nova-border px-4 py-3">
            <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-2xl font-bold outline-none" />
            <p className="mt-1 text-xs text-nova-muted">Available: {marketService.formatAmount(balance, asset.decimals)} {asset.symbol}</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-nova-muted">Note (optional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Add a transfer note" className="w-full rounded-xl bg-nova-surface border border-nova-border px-4 py-3 text-sm outline-none focus:border-nova-accent" />
        </div>

        {error && (
          <Card className="border-nova-error/20 bg-nova-error/5 p-3">
            <div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-nova-error" /><p className="text-xs text-nova-error">{error}</p></div>
          </Card>
        )}

        <Card className="border-nova-warning/20 bg-nova-warning/5 p-3">
          <p className="text-xs text-nova-muted">Transfers are atomic and protected against duplicate submission. Verify the AQV ID before confirming.</p>
        </Card>

        <Button fullWidth size="lg" disabled={busy} onClick={() => void submit()}>{busy ? 'Sending…' : 'Confirm & Send'}</Button>
      </div>
    </div>
  );
}
