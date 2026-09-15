import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({ title, subtitle, right, showBack = true }: ScreenHeaderProps) {
  const { canGoBack, goBack } = useRouter();
  const { haptic } = useUi();

  const handleBack = () => {
    haptic('light');
    goBack();
  };

  return (
    <header className="glass sticky top-0 z-40 border-b border-nova-border safe-top">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
        {showBack && canGoBack && (
          <button
            onClick={handleBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nova-surface-2 text-nova-text transition-transform active:scale-90"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="truncate text-xs text-nova-muted">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
