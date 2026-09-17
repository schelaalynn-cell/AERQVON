import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { marketService } from '@/services/marketService';
import { AssetRow } from '@/components/AssetRow';
import { DemoBadge } from '@/components/DemoBadge';
import { Card } from '@/components/ui/Card';
import { ArrowDownLeft, Send, ArrowLeftRight, Info } from 'lucide-react';

export function WalletScreen() {
  const { wallet, assets, balances, portfolio } = useApp();
  const { navigate } = useRouter();
  const { haptic } = useUi();

  return (
    <div className="pb-24">
      <div className="px-4 pt-6 pb-2 safe-top">
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Wallet</h1>
            <DemoBadge />
          </div>

          <Card className="overflow-hidden p-5" glow>
            <p className="text-xs text-nova-muted">Total Balance</p>
            <p className="mt-1 font-display text-3xl font-bold">
              {marketService.formatUsd(portfolio.totalUsd)}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => { haptic('light'); navigate({ name: 'receive' }); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-nova-surface-2 py-3 transition-all active:scale-95"
              >
                <ArrowDownLeft className="h-5 w-5 text-nova-accent" />
                <span className="text-xs font-medium">Receive</span>
              </button>
              <button
                onClick={() => { haptic('light'); navigate({ name: 'aqv-send' }); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-nova-surface-2 py-3 transition-all active:scale-95"
              >
                <Send className="h-5 w-5 text-nova-accent" />
                <span className="text-xs font-medium">Send to AQV ID</span>
              </button>
              <button
                onClick={() => { haptic('light'); navigate({ name: 'swap-detail' }); }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-nova-surface-2 py-3 transition-all active:scale-95"
              >
                <ArrowLeftRight className="h-5 w-5 text-nova-accent" />
                <span className="text-xs font-medium">Swap</span>
              </button>
            </div>
          </Card>

          <div className="mt-3 flex items-center gap-2 rounded-xl bg-nova-surface border border-nova-border px-4 py-3">
            <Info className="h-4 w-4 shrink-0 text-nova-dim" />
            <p className="truncate font-mono text-xs text-nova-muted">{wallet.address}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md px-4 mt-4">
        <h2 className="mb-2.5 font-display text-base font-semibold">Your Assets</h2>
        <div className="space-y-2.5">
          {balances.map((b, i) => {
            const asset = assets.find((a) => a.id === b.assetId);
            if (!asset) return null;
            return (
              <div key={b.assetId} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <AssetRow
                  asset={asset}
                  amount={b.amount}
                  usdValue={b.usdValue}
                  onClick={() => navigate({ name: 'asset', assetId: asset.id })}
                />
              </div>
            );
          })}
        </div>

        <Card className="mt-4 border-nova-warning/20 bg-nova-warning/5 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-nova-warning" />
            <p className="text-xs text-nova-muted">
              BTC and ETH are <span className="font-medium text-nova-warning">simulated assets</span> for
              demonstration. They are not connected to real blockchains in demo mode.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
