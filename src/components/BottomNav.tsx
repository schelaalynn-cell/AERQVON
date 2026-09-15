import { Home, TrendingUp, CandlestickChart, Wallet, Settings } from 'lucide-react';
import type { TabId } from '@/context/RouterContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import type { ComponentType } from 'react';

interface TabConfig {
  id: TabId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'trade', label: 'Trade', icon: CandlestickChart },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const { tab, setTab } = useRouter();
  const { hapticSelection } = useUi();

  const handleTabChange = (id: TabId) => {
    if (id === tab) return;
    hapticSelection();
    setTab(id);
  };

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-50 border-t border-nova-border safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className="group flex flex-1 flex-col items-center gap-1 py-1.5 transition-all"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-nova-accent/15 text-nova-accent scale-105'
                    : 'text-nova-dim group-active:scale-90'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? 'text-nova-accent' : 'text-nova-dim'
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
