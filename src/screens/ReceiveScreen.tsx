import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { walletService } from '@/services/walletService';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { QRCode } from '@/components/ui/QRCode';
import { CopyButton } from '@/components/ui/CopyButton';
import { AlertTriangle, Share2, ChevronDown, Check } from 'lucide-react';
import type { Asset } from '@/types';

interface ReceiveScreenProps {
  assetId?: string;
}

export function ReceiveScreen({ assetId }: ReceiveScreenProps) {
  const { wallet, assets } = useApp();
  const { goBack: _goBack } = useRouter();
  const { haptic, hapticNotify, shareMessage } = useUi();
  const [selectedAssetId, setSelectedAssetId] = useState(assetId ?? 'GRAM');
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const asset = assets.find((a) => a.id === selectedAssetId) ?? assets[0];
  const network = walletService.getNetwork(asset.networkId);

  const handleShare = () => {
    haptic('light');
    const msg = `Send ${asset.symbol} on ${network?.name} to my AERQVON wallet: ${wallet.address}`;
    if (!shareMessage(msg)) {
      navigator.clipboard?.writeText(msg);
      hapticNotify('success');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title="Receive" subtitle="Get crypto into your wallet" />

      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-aerqvon-muted">Asset</label>
          <button
            onClick={() => { haptic('light'); setShowAssetPicker((v) => !v); }}
            className="flex w-full items-center justify-between rounded-xl bg-aerqvon-surface border border-aerqvon-border px-4 py-3 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <AssetIcon asset={asset} size={36} />
              <div className="text-left">
                <p className="font-medium">{asset.name}</p>
                <p className="text-xs text-aerqvon-muted">{asset.symbol} · {network?.shortName}</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-aerqvon-dim transition-transform ${showAssetPicker ? 'rotate-180' : ''}`} />
          </button>

          {showAssetPicker && (
            <Card className="mt-2 overflow-hidden animate-scale-in">
              {assets.map((a) => (
                <AssetOption
                  key={a.id}
                  asset={a}
                  selected={a.id === selectedAssetId}
                  onClick={() => {
                    haptic('light');
                    setSelectedAssetId(a.id);
                    setShowAssetPicker(false);
                  }}
                />
              ))}
            </Card>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-xl bg-aerqvon-surface border border-aerqvon-border px-4 py-3">
          <span className="text-sm text-aerqvon-muted">Network</span>
          <span className="text-sm font-medium">{network?.name ?? 'TON'}</span>
        </div>

        <Card className="flex flex-col items-center p-6 animate-scale-in" glow>
          <div className="rounded-3xl bg-white p-4 shadow-card">
            <QRCode value={wallet.address} size={220} />
          </div>
          <p className="mt-4 text-xs text-aerqvon-muted">Scan to send {asset.symbol}</p>
          <p className="mt-1 font-display text-lg font-semibold">{asset.name} ({asset.symbol})</p>
          <p className="text-xs text-aerqvon-dim">on {network?.name}</p>
        </Card>

        <Card className="mt-4 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-aerqvon-dim">
            Wallet Address
          </p>
          <p className="break-all font-mono text-sm leading-relaxed">{wallet.address}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" fullWidth>
              <CopyButton value={wallet.address} label="Copy Address" className="text-sm" />
            </Button>
            <Button variant="secondary" size="sm" fullWidth onClick={handleShare}>
              <Share2 className="mr-1.5 inline h-4 w-4" />
              Share
            </Button>
          </div>
        </Card>

        <Card className="mt-4 border-aerqvon-error/20 bg-aerqvon-error/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-error" />
            <div>
              <p className="text-sm font-medium text-aerqvon-error">Important</p>
              <p className="mt-1 text-xs text-aerqvon-muted">
                Only send assets supported by this wallet and network. Sending unsupported assets may
                result in permanent loss of funds.
              </p>
            </div>
          </div>
        </Card>

        <p className="mt-3 text-center text-[10px] text-aerqvon-dim">
          Using demo address — not a real wallet
        </p>
      </div>
    </div>
  );
}

function AssetOption({
  asset,
  selected,
  onClick,
}: {
  asset: Asset;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-aerqvon-surface-2/50 active:bg-aerqvon-surface-2"
    >
      <AssetIcon asset={asset} size={32} />
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{asset.name}</p>
        <p className="text-xs text-aerqvon-muted">{asset.symbol}</p>
      </div>
      {selected && <Check className="h-4 w-4 text-aerqvon-accent" />}
    </button>
  );
}
