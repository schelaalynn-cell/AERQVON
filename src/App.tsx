import { useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/hooks/useTheme';
import { BottomNav } from '@/components/BottomNav';
import { Onboarding } from '@/screens/Onboarding';
import { AuthScreen } from '@/screens/AuthScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { MarketsScreen } from '@/screens/MarketsScreen';
import { TradeScreen } from '@/screens/TradeScreen';
import { WalletScreen } from '@/screens/WalletScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { AssetDetailScreen } from '@/screens/AssetDetailScreen';
import { ReceiveScreen } from '@/screens/ReceiveScreen';
import { SendScreen } from '@/screens/SendScreen';
import { AqvSendScreen } from '@/screens/AqvSendScreen';
import { SwapScreen } from '@/screens/SwapScreen';
import { ActivityScreen } from '@/screens/ActivityScreen';
import { TransactionDetailScreen } from '@/screens/TransactionDetailScreen';

function ScreenRouter() {
  const { route, goBack, canGoBack } = useRouter();
  const { showBackButton, hideBackButton } = useUi();

  useEffect(() => {
    if (canGoBack && route.name !== 'tab') showBackButton(goBack);
    else hideBackButton();
    return () => hideBackButton();
  }, [canGoBack, route, goBack, showBackButton, hideBackButton]);

  switch (route.name) {
    case 'tab':
      switch (route.tab) {
        case 'home': return <HomeScreen />;
        case 'markets': return <MarketsScreen />;
        case 'trade': return <TradeScreen />;
        case 'wallet': return <WalletScreen />;
        case 'settings': return <SettingsScreen />;
      }
      return <HomeScreen />;
    case 'asset': return <AssetDetailScreen assetId={route.assetId} />;
    case 'receive': return <ReceiveScreen assetId={route.assetId} />;
    case 'send': return <SendScreen assetId={route.assetId} />;
    case 'aqv-send': return <AqvSendScreen assetId={route.assetId} />;
    case 'swap-detail': return <SwapScreen />;
    case 'transaction': return <TransactionDetailScreen txId={route.txId} />;
    case 'activity': return <ActivityScreen />;
    case 'onboarding': return null;
    default: return <HomeScreen />;
  }
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nova-bg text-nova-text">
        <div className="text-sm text-nova-muted">Loading AERQVON…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { onboarded, completeOnboarding } = useOnboarding();
  const { route } = useRouter();
  const showBottomNav = route.name === 'tab';

  if (!onboarded) return <Onboarding onComplete={completeOnboarding} />;

  return (
    <div className="min-h-screen bg-nova-bg text-nova-text">
      <div className="mx-auto min-h-screen max-w-md">
        <ScreenRouter />
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  useTheme();

  return (
    <>
      <AuthProvider>
        <RouterProvider>
          <AuthGate />
        </RouterProvider>
      </AuthProvider>
      <SpeedInsights />
    </>
  );
}

export default App;
