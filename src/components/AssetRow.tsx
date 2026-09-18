import type { Asset } from '@/types';
import { AssetIcon } from '@/components/ui/AssetIcon';
import { Card } from '@/components/ui/Card';
import { marketService } from '@/services/marketService';
import { ChevronRight, Sparkles } from 'lucide-react';

interface AssetRowProps {
  asset: Asset;
  amount: number;
  usdValue: number;
  onClick?: () => void;
  showChevron?: boolean;
}

export function AssetRow({ asset, amount, usdValue, onClick, showChevron = true }: AssetRowProps) {
  const change = asset.change24h;
  const positive = change >= 0;

  return (
    <Card onClick={onClick} className="p-3.5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <AssetIcon asset={asset} size={44} />
          {asset.isSimulated && (
            <span className="absolute -bottom-1 -right-1 rounded-full bg-aerqvon-bg px-1 py-0.5 text-[7px] font-bold uppercase text-aerqvon-warning">
              Sim
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{asset.name}</span>
            <span className="text-xs text-aerqvon-muted">{asset.symbol}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="text-xs text-aerqvon-muted">{marketService.formatPrice(asset.priceUsd)}</span>
            <span
              className={`text-xs font-medium ${positive ? 'text-aerqvon-success' : 'text-aerqvon-error'}`}
            >
              {marketService.formatPct(change)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{marketService.formatAmount(amount, asset.decimals)}</div>
          <div className="text-xs text-aerqvon-muted">{marketService.formatUsd(usdValue)}</div>
        </div>
        {showChevron && <ChevronRight className="h-4 w-4 text-aerqvon-dim" />}
      </div>
    </Card>
  );
}
