import type { Transaction } from '@/types';
import { marketService } from '@/services/marketService';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface TxRowProps {
  tx: Transaction;
  onClick?: () => void;
}

export function TxRow({ tx, onClick }: TxRowProps) {
  const isIn = tx.direction === 'in';
  const isSwap = tx.direction === 'swap';

  const Icon = isSwap ? ArrowLeftRight : isIn ? ArrowDownLeft : ArrowUpRight;
  const iconBg = isSwap
    ? 'bg-nova-accent-2/15 text-nova-accent-2'
    : isIn
    ? 'bg-nova-success/15 text-nova-success'
    : 'bg-nova-surface-3 text-nova-muted';

  const StatusIcon =
    tx.status === 'pending' ? Clock : tx.status === 'completed' ? CheckCircle2 : XCircle;
  const statusColor =
    tx.status === 'pending' ? 'text-nova-warning' : tx.status === 'completed' ? 'text-nova-success' : 'text-nova-error';

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-nova-surface-2/50 active:bg-nova-surface-2"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium">{isSwap ? 'Swap' : isIn ? 'Received' : 'Sent'}</span>
          <span className="text-xs text-nova-muted">{tx.assetSymbol}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-nova-muted">
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span>{marketService.formatTimeAgo(tx.timestamp)}</span>
          {tx.status === 'pending' && <span className="capitalize">· {tx.status}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-semibold ${isIn ? 'text-nova-success' : ''}`}>
          {isIn ? '+' : '-'}{marketService.formatAmount(tx.amount, 4)} {tx.assetSymbol}
        </div>
        {isSwap && tx.swapToAmount && (
          <div className="text-xs text-nova-success">+{marketService.formatAmount(tx.swapToAmount, 4)} {tx.swapTo}</div>
        )}
      </div>
    </button>
  );
}
