import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TabId = 'home' | 'markets' | 'trade' | 'wallet' | 'settings';
export type Route =
  | { name: 'tab'; tab: TabId }
  | { name: 'asset'; assetId: string }
  | { name: 'receive'; assetId?: string }
  | { name: 'send'; assetId?: string }
  | { name: 'swap-detail' }
  | { name: 'transaction'; txId: string }
  | { name: 'activity' }
  | { name: 'onboarding' };

interface RouterValue {
  route: Route;
  tab: TabId;
  navigate: (route: Route) => void;
  goBack: () => void;
  setTab: (tab: TabId) => void;
  canGoBack: boolean;
}

const RouterContext = createContext<RouterValue | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<Route[]>([{ name: 'tab', tab: 'home' }]);

  const route = history[history.length - 1];
  const tab = route.name === 'tab' ? route.tab : history.find((r) => r.name === 'tab')?.tab ?? 'home';

  const navigate = useCallback((newRoute: Route) => {
    setHistory((h) => [...h, newRoute]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }, []);

  const setTab = useCallback((newTab: TabId) => {
    setHistory([{ name: 'tab', tab: newTab }]);
  }, []);

  const canGoBack = history.length > 1;

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      e.preventDefault();
      goBack();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [goBack]);

  const value = useMemo(
    () => ({ route, tab, navigate, goBack, setTab, canGoBack }),
    [route, tab, navigate, goBack, setTab, canGoBack]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
