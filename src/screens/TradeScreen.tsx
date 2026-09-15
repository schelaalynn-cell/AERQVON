import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { DemoBadge } from '@/components/DemoBadge';
import { useUi } from '@/hooks/useUi';
import type { TradingMode } from '@/types';
import { CEXTradeView } from '@/screens/trade/CEXTradeView';
import { DEXTradeView } from '@/screens/trade/DEXTradeView';

const MODE_TABS: { label: string; value: TradingMode }[] = [
  { label: 'Spot', value: 'cex' },
  { label: 'Swap', value: 'dex' },
];

export function TradeScreen() {
  const { haptic } = useUi();
  const [mode, setMode] = useState<TradingMode>('cex');

  const handleModeChange = (m: TradingMode) => {
    haptic('light');
    setMode(m);
  };

  return (
    <div>
      <ScreenHeader title="Trade" subtitle="Spot trading & swaps" right={<DemoBadge />} />

      <div className="px-4 pt-2">
        <div className="flex gap-1 rounded-xl bg-nova-surface-2 p-1">
          {MODE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleModeChange(tab.value)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                mode === tab.value
                  ? 'bg-nova-accent text-white shadow-glow'
                  : 'text-nova-dim'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 pb-24">
        {mode === 'cex' ? <CEXTradeView /> : <DEXTradeView />}
      </div>
    </div>
  );
}
