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
    ? 'bg-aerqvon-accent-2/15 text-aerqvon-accent-2'
    : isIn
    ? 'bg-aerqvon-success/15 text-aerqvon-success'
    : 'bg-aerqvon-surface-3 text-aerqvon-muted';

  const StatusIcon =
    tx.status === 'pending' ? Clock : tx.status === 'completed' ? CheckCircle2 : XCircle;
  const statusColor =
    tx.status === 'pending' ? 'text-aerqvon-warning' : tx.status === 'completed' ? 'text-aerqvon-success' : 'text-aerqvon-error';

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-aerqvon-surface-2/50 active:bg-aerqvon-surface-2"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium">{isSwap ? 'Swap' : isIn ? 'Received' : 'Sent'}</span>
          <span className="text-xs text-aerqvon-muted">{tx.assetSymbol}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-aerqvon-muted">
          <StatusIcon className={`h-3 w-3 ${statusColor}`} />
          <span>{marketService.formatTimeAgo(tx.timestamp)}</span>
          {tx.status === 'pending' && <span className="capitalize">· {tx.status}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-semibold ${isIn ? 'text-aerqvon-success' : ''}`}>
          {isIn ? '+' : '-'}{marketService.formatAmount(tx.amount, 4)} {tx.assetSymbol}
        </div>
        {isSwap && tx.swapToAmount && (
          <div className="text-xs text-aerqvon-success">+{marketService.formatAmount(tx.swapToAmount, 4)} {tx.swapTo}</div>
        )}
      </div>
    </button>
  );
}
