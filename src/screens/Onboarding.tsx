import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { useUi } from '@/hooks/useUi';
import { walletService } from '@/services/walletService';
import { config } from '@/config';
import { connectWallet } from '@/services/ton/TonConnectService';
import { Shield, Sparkles, Lock, ArrowRight, Info, Wallet2, AlertTriangle, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'create' | 'import' | 'demo' | 'connect';

export function Onboarding({ onComplete }: OnboardingProps) {
  const { haptic, hapticNotify } = useUi();
  const [step, setStep] = useState<Step>('welcome');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  const handleCreate = () => {
    haptic('medium');
    walletService.createWallet();
    hapticNotify('success');
    onComplete();
  };

  const handleDemo = () => {
    haptic('medium');
    onComplete();
  };

  const handleConnect = async () => {
    haptic('medium');
    setConnecting(true);
    setConnectError('');
    try {
      await connectWallet();
      hapticNotify('success');
      onComplete();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect wallet';
      setConnectError(msg);
      hapticNotify('error');
    } finally {
      setConnecting(false);
    }
  };

  if (step === 'welcome') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center animate-slide-up">
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-pulse-ring rounded-3xl bg-aerqvon-accent/30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-aerqvon-accent to-aerqvon-accent-2 shadow-glow">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          <DemoBadge className="mb-4" />
          <h1 className="font-display text-3xl font-bold tracking-tight">
            AERQVON
            <br />
            <span className="bg-gradient-to-r from-aerqvon-accent to-aerqvon-accent-2 bg-clip-text text-transparent">
              Wallet & Trading
            </span>
          </h1>
          <p className="mt-3 max-w-xs text-sm text-aerqvon-muted">
            Send, receive, swap, and spot-trade Gram on TON — right from your wallet.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Button fullWidth size="lg" onClick={() => { haptic('light'); setStep('connect'); }}>
            <Wallet2 className="mr-2 inline h-4 w-4" />
            Connect TON Wallet
          </Button>
          <Button fullWidth size="lg" variant="secondary" onClick={() => { haptic('light'); setStep('create'); }}>
            Create Demo Wallet
            <ArrowRight className="ml-2 inline h-4 w-4" />
          </Button>
          <Button fullWidth size="lg" variant="ghost" onClick={handleDemo}>
            Continue in Demo Mode
          </Button>
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-aerqvon-dim animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Shield className="h-3.5 w-3.5" />
          <span>No real funds. Simulated transactions only.</span>
        </div>
      </div>
    );
  }

  if (step === 'create') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-aerqvon-accent/15">
              <Sparkles className="h-8 w-8 text-aerqvon-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold">Create Your Wallet</h2>
            <p className="mt-2 text-sm text-aerqvon-muted">
              A demo wallet identity will be generated. No real private keys or seed phrases are stored.
            </p>
          </div>

          <Card className="mb-4 p-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">Demo wallet address generated locally</span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">No seed phrases stored or requested</span>
              </li>
              <li className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">All transactions are simulated</span>
              </li>
            </ul>
          </Card>

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleCreate}>Create Demo Wallet</Button>
            <Button fullWidth variant="ghost" onClick={() => setStep('welcome')}>Back</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'connect') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-aerqvon-accent/15">
              <Wallet2 className="h-8 w-8 text-aerqvon-accent" />
            </div>
            <h2 className="font-display text-2xl font-bold">Connect TON Wallet</h2>
            <p className="mt-2 text-sm text-aerqvon-muted">
              Link an external TON wallet (Tonkeeper, MyTonWallet, etc.) via TON Connect.
              Your private keys stay in your wallet — this app never sees them.
            </p>
          </div>

          {!config.securityReviewPassed && (
            <Card className="mb-4 border-aerqvon-warning/30 bg-aerqvon-warning/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-warning" />
                <p className="text-xs text-aerqvon-muted">
                  TON Connect is integrated but real wallet connections are disabled until the security review is complete.
                </p>
              </div>
            </Card>
          )}

          <Card className="mb-4 p-4">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">Private keys never leave your wallet</span>
              </li>
              <li className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">You approve every transaction on your device</span>
              </li>
              <li className="flex items-start gap-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-aerqvon-success" />
                <span className="text-aerqvon-muted">Powered by TON Connect protocol</span>
              </li>
            </ul>
          </Card>

          {connectError && (
            <Card className="mb-4 border-aerqvon-error/30 bg-aerqvon-error/5 p-3">
              <p className="text-xs text-aerqvon-error">{connectError}</p>
            </Card>
          )}

          <div className="space-y-3">
            <Button fullWidth size="lg" onClick={handleConnect} disabled={connecting || !config.securityReviewPassed}>
              {connecting ? (
                <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Connecting...</>
              ) : 'Connect Wallet'}
            </Button>
            <Button fullWidth variant="ghost" onClick={() => setStep('welcome')}>Back</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'import') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-aerqvon-warning/15">
              <Lock className="h-8 w-8 text-aerqvon-warning" />
            </div>
            <h2 className="font-display text-2xl font-bold">Import Wallet</h2>
          </div>

          <Card className="mb-4 border-aerqvon-warning/30 bg-aerqvon-warning/5 p-4">
            <p className="text-sm text-aerqvon-text">
              Secure wallet import will be enabled after production key management is implemented.
            </p>
          </Card>

          <Card className="mb-4 p-4 opacity-60">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-aerqvon-muted">Seed phrase (disabled)</label>
                <div className="rounded-xl border border-aerqvon-border bg-aerqvon-surface-2 px-4 py-3 text-sm text-aerqvon-dim">Disabled in demo mode</div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-aerqvon-muted">Private key (disabled)</label>
                <div className="rounded-xl border border-aerqvon-border bg-aerqvon-surface-2 px-4 py-3 text-sm text-aerqvon-dim">Disabled in demo mode</div>
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            <Button fullWidth size="lg" disabled>Import (Locked)</Button>
            <Button fullWidth variant="ghost" onClick={() => setStep('welcome')}>Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
