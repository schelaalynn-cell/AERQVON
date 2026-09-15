import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { marketService } from '@/services/marketService';
import { TxRow } from '@/components/TxRow';
import { Card } from '@/components/ui/Card';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { TransactionStatus, TransactionDirection } from '@/types';

type Filter = 'all' | 'in' | 'out' | 'swap' | TransactionStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Received' },
  { id: 'out', label: 'Sent' },
  { id: 'swap', label: 'Swap' },
  { id: 'pending', label: 'Pending' },
];

export function ActivityScreen() {
  const { transactions } = useApp();
  const { navigate } = useRouter();
  const { haptic } = useUi();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'in' || filter === 'out' || filter === 'swap') return tx.direction === filter;
    return tx.status === filter;
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-2 safe-top">
        <div className="mx-auto max-w-md">
          <h1 className="mb-4 font-display text-2xl font-bold">Activity</h1>

          <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { haptic('light'); setFilter(f.id); }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  filter === f.id
                    ? 'bg-nova-accent text-white'
                    : 'bg-nova-surface border border-nova-border text-nova-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <StatCard
            icon={ArrowDownLeft}
            label="Received"
            count={transactions.filter((t) => t.direction === 'in').length}
            color="text-nova-success"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Sent"
            count={transactions.filter((t) => t.direction === 'out').length}
            color="text-nova-accent"
          />
          <StatCard
            icon={ArrowLeftRight}
            label="Swaps"
            count={transactions.filter((t) => t.direction === 'swap').length}
            color="text-nova-accent-2"
          />
        </div>

        {filtered.length > 0 ? (
          <Card className="overflow-hidden">
            <div className="divide-y divide-nova-border">
              {filtered.map((tx, i) => (
                <div key={tx.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                  <TxRow tx={tx} onClick={() => navigate({ name: 'transaction', txId: tx.id })} />
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-nova-dim" />
            <p className="text-sm text-nova-muted">No transactions found</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: typeof Clock;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-1.5 p-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="font-display text-lg font-bold">{count}</span>
      <span className="text-[10px] text-nova-muted">{label}</span>
    </Card>
  );
}
