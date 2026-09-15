import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { walletService } from '@/services/walletService';
import { marketService } from '@/services/marketService';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock, CheckCircle2, XCircle, AlertTriangle, Copy } from 'lucide-react';

interface TransactionDetailScreenProps {
  txId: string;
}

export function TransactionDetailScreen({ txId }: TransactionDetailScreenProps) {
  const { transactions, assets } = useApp();
  const { goBack } = useRouter();
  const { haptic } = useUi();

  const tx = transactions.find((t) => t.id === txId);
  if (!tx) {
    return (
      <div className="flex min-h-screen items-center justify-center text-nova-muted">
        Transaction not found
      </div>
    );
  }

  const asset = assets.find((a) => a.id === tx.assetId);
  const network = walletService.getNetwork(tx.networkId);
  const isIn = tx.direction === 'in';
  const isSwap = tx.direction === 'swap';

  const Icon = isSwap ? ArrowLeftRight : isIn ? ArrowDownLeft : ArrowUpRight;
  const iconBg = isSwap
    ? 'bg-nova-accent-2/15 text-nova-accent-2'
    : isIn
    ? 'bg-nova-success/15 text-nova-success'
    : 'bg-nova-surface-3 text-nova-muted';

  const StatusIcon = tx.status === 'pending' ? Clock : tx.status === 'completed' ? CheckCircle2 : XCircle;
  const statusColor =
    tx.status === 'pending' ? 'text-nova-warning' : tx.status === 'completed' ? 'text-nova-success' : 'text-nova-error';
  const statusBg =
    tx.status === 'pending' ? 'bg-nova-warning/15' : tx.status === 'completed' ? 'bg-nova-success/15' : 'bg-nova-error/15';

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title="Transaction Details" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <Card className="flex flex-col items-center p-6 animate-scale-in" glow>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${iconBg} mb-3`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className={`flex items-center gap-1.5 rounded-full ${statusBg} px-3 py-1`}>
            <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
            <span className={`text-xs font-semibold capitalize ${statusColor}`}>{tx.status}</span>
          </div>
          <p className="mt-3 font-display text-2xl font-bold">
            {isIn ? '+' : '-'}{marketService.formatAmount(tx.amount, 4)} {tx.assetSymbol}
          </p>
          <p className="text-sm text-nova-muted">{marketService.formatUsd(tx.usdValue)}</p>
          <p className="mt-1 text-xs text-nova-dim">{marketService.formatDate(tx.timestamp)}</p>
        </Card>

        {isSwap && tx.swapFrom && tx.swapTo && (
          <Card className="mt-3 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AssetIcon asset={assets.find((a) => a.id === tx.swapFrom) ?? assets[0]} size={28} />
                <div>
                  <p className="text-sm font-medium">{tx.swapFrom}</p>
                  <p className="text-xs text-nova-muted">-{marketService.formatAmount(tx.swapFromAmount ?? 0, 4)}</p>
                </div>
              </div>
              <ArrowLeftRight className="h-4 w-4 text-nova-dim" />
              <div className="flex items-center gap-2">
                <AssetIcon asset={assets.find((a) => a.id === tx.swapTo) ?? assets[0]} size={28} />
                <div>
                  <p className="text-sm font-medium">{tx.swapTo}</p>
                  <p className="text-xs text-nova-success">+{marketService.formatAmount(tx.swapToAmount ?? 0, 4)}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="mt-3 divide-y divide-nova-border">
          <DetailRow label="Type" value={isSwap ? 'Swap' : isIn ? 'Receive' : 'Send'} />
          <DetailRow label="Asset" value={asset ? `${asset.name} (${asset.symbol})` : tx.assetSymbol} />
          <DetailRow label="Network" value={network?.name ?? tx.networkId} />
          <DetailRow label="Amount" value={`${marketService.formatAmount(tx.amount, 4)} ${tx.assetSymbol}`} />
          {tx.fee !== undefined && <DetailRow label="Network fee" value={`${tx.fee} ${tx.feeAsset}`} />}
          {tx.counterparty && (
            <DetailRow
              label={isIn ? 'From' : 'To'}
              value={`${tx.counterparty.slice(0, 10)}...${tx.counterparty.slice(-6)}`}
              mono
            />
          )}
          {tx.memo && <DetailRow label="Memo" value={tx.memo} />}
          <DetailRow label="Date" value={marketService.formatDate(tx.timestamp)} />
          <DetailRow label="Transaction ID" value={tx.id} mono />
          <div className="px-4 py-3">
            <span className="text-sm text-nova-muted">Transaction Hash</span>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="truncate font-mono text-xs text-nova-muted">{tx.txHash}</p>
              <button
                onClick={() => { haptic('light'); navigator.clipboard?.writeText(tx.txHash); }}
                className="shrink-0 text-nova-accent"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>

        <Card className="mt-3 border-nova-warning/20 bg-nova-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-nova-warning" />
            <p className="text-xs text-nova-muted">
              Demo transaction — not broadcast to TON. This is a simulated transaction for demonstration purposes only.
            </p>
          </div>
        </Card>

        <Button fullWidth variant="secondary" size="lg" className="mt-4" onClick={() => { haptic('light'); goBack(); }}>
          Close
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-nova-muted">{label}</span>
      <span className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}
