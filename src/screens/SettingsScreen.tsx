import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useUi } from '@/hooks/useUi';
import { useTheme } from '@/hooks/useTheme';
import { useOnboarding } from '@/hooks/useOnboarding';
import { config } from '@/config';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { DemoBadge } from '@/components/DemoBadge';
import { User, Shield, Settings as SettingsIcon, HelpCircle, Info, ChevronRight, Globe, Moon, Sun, Languages, DollarSign, Lock, KeyRound, Fingerprint, LogOut, Flag, FileText, ShieldCheck, Hash, Wallet, Copy, Check, Rocket, ExternalLink, CircleCheck } from 'lucide-react';
import type { ComponentType } from 'react';

export function SettingsScreen() {
  const { wallet } = useApp();
  const { goBack: _goBack } = useRouter();
  const { user, haptic } = useUi();
  const { theme, setTheme } = useTheme();
  const { resetOnboarding } = useOnboarding();
  const [mintCopied, setMintCopied] = useState(false);
  const aqvMintAddress = config.aqvSolanaMintAddress;
  const aqvLaunched = Boolean(aqvMintAddress);

  return (
    <div className="min-h-screen pb-24">
      <ScreenHeader title="Settings" showBack={false} />
      <div className="mx-auto max-w-md px-4 pt-4 space-y-6">
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">Profile</h2><Card className="overflow-hidden"><div className="flex items-center gap-3 border-b border-nova-border p-4"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-nova-accent to-nova-accent-2 font-bold text-white">{user.firstName.charAt(0)}</div><div className="flex-1"><p className="font-semibold">{user.firstName} {user.lastName ?? ''}</p><p className="text-xs text-nova-muted">@{user.username || 'aerqvon_user'}</p></div></div><SettingRow icon={User} label="Username" value={`@${user.username || 'aerqvon_user'}`} /><SettingRow icon={Hash} label="User ID" value={String(user.id)} /><SettingRow icon={Wallet} label="Wallet address" value={`${wallet.address.slice(0, 8)}...${wallet.address.slice(-6)}`} mono /></Card></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">AERQVON Launch</h2><Card className="overflow-hidden"><div className="border-b border-nova-border p-4"><div className="flex items-center gap-3 mb-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-nova-accent to-nova-accent-2"><Rocket className="h-5 w-5 text-white" /></div><div className="flex-1"><p className="font-semibold text-sm">AERQVON (AQV)</p><p className="text-xs text-nova-muted">Solana · Pump.fun</p></div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${aqvLaunched ? 'bg-nova-success/15 text-nova-success' : 'bg-nova-warning/15 text-nova-warning'}`}>{aqvLaunched ? 'LIVE' : 'PRE-LAUNCH'}</span></div>{aqvLaunched ? (<div className="space-y-3"><div className="rounded-xl bg-nova-surface-2 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wide text-nova-dim">Official Mint Address</p><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate font-mono text-xs">{aqvMintAddress}</span><button onClick={() => { navigator.clipboard?.writeText(aqvMintAddress); setMintCopied(true); haptic('light'); setTimeout(() => setMintCopied(false), 2000); }} className="shrink-0 text-nova-dim transition-colors hover:text-nova-accent">{mintCopied ? <Check className="h-3.5 w-3.5 text-nova-success" /> : <Copy className="h-3.5 w-3.5" />}</button></div><a href={`https://pump.fun/coin/${aqvMintAddress}`} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl bg-nova-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-nova-accent-2"><ExternalLink className="h-4 w-4" />View on Pump.fun</a></div>) : (<div className="space-y-3"><div className="flex items-start gap-2 rounded-xl bg-nova-warning/10 px-3 py-2.5"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-nova-warning" /><p className="text-[11px] text-nova-muted leading-relaxed">AERQVON has not launched yet. The official Solana mint address will be added here once the token is created on Pump.fun. Do not trust any AQV token address from third parties.</p></div><div className="flex items-center justify-center gap-2 rounded-xl bg-nova-surface-2 py-2.5 text-sm font-medium text-nova-dim"><Rocket className="h-4 w-4 text-nova-warning" />Launch CTA available after launch</div></div>)}</div></Card></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">Security</h2><Card className="overflow-hidden divide-y divide-nova-border"><SettingRow icon={ShieldCheck} label="Security Center" chevron /><SettingRow icon={Shield} label="Wallet Security" chevron /><SettingRow icon={KeyRound} label="Backup Wallet" chevron badge="Demo" /><SettingRow icon={Lock} label="Lock Wallet" chevron /><SettingRow icon={Fingerprint} label="Biometric security" chevron badge="Soon" /></Card></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">Preferences</h2><Card className="overflow-hidden divide-y divide-nova-border"><div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-nova-dim" /><span className="text-sm">Currency</span></div><span className="text-sm font-medium text-nova-muted">USD</span></div><div className="flex items-center justify-between px-4 py-3"><div className="flex items-center gap-3"><Languages className="h-4 w-4 text-nova-dim" /><span className="text-sm">Language</span></div><span className="text-sm font-medium text-nova-muted">English</span></div><div className="px-4 py-3"><div className="mb-2 flex items-center gap-3">{theme === 'dark' ? <Moon className="h-4 w-4 text-nova-dim" /> : theme === 'light' ? <Sun className="h-4 w-4 text-nova-dim" /> : <Globe className="h-4 w-4 text-nova-dim" />}<span className="text-sm">Theme</span></div><div className="flex gap-2">{(['dark', 'light', 'system'] as const).map((t) => (<button key={t} onClick={() => { haptic('light'); setTheme(t); }} className={`flex-1 rounded-xl py-2 text-xs font-medium capitalize transition-all ${theme === t ? 'bg-nova-accent text-white' : 'bg-nova-surface-2 text-nova-muted'}`}>{t}</button>))}</div></div></Card></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">Support</h2><Card className="overflow-hidden divide-y divide-nova-border"><SettingRow icon={HelpCircle} label="Help" chevron /><SettingRow icon={Flag} label="Report Problem" chevron /><SettingRow icon={Shield} label="Security" chevron /></Card></div>
        <div><h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">About</h2><Card className="overflow-hidden divide-y divide-nova-border"><SettingRow icon={Info} label="Version" value="1.0.0 (Demo)" /><SettingRow icon={FileText} label="Terms of Service" chevron /><SettingRow icon={Shield} label="Privacy Policy" chevron /></Card></div>
        <div className="flex flex-col items-center gap-3 pb-4"><DemoBadge /><button onClick={() => { haptic('medium'); resetOnboarding(); }} className="flex items-center gap-2 text-xs text-nova-dim transition-colors hover:text-nova-error"><LogOut className="h-3.5 w-3.5" />Reset onboarding</button><p className="text-center text-[10px] text-nova-dim">AERQVON · Crypto Wallet & Spot Trading · Demo Mode</p></div>
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value, chevron = false, badge, mono = false }: { icon: ComponentType<{ className?: string }>; label: string; value?: string; chevron?: boolean; badge?: string; mono?: boolean }) {
  const { haptic } = useUi();
  return (
    <button onClick={() => haptic('light')} className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-nova-surface-2/50 active:bg-nova-surface-2">
      <div className="flex items-center gap-3"><Icon className="h-4 w-4 text-nova-dim" /><span className="text-sm">{label}</span>{badge && <span className="rounded-full bg-nova-warning/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-nova-warning">{badge}</span>}</div>
      {value && <span className={`text-sm text-nova-muted ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>}
      {chevron && <ChevronRight className="h-4 w-4 text-nova-dim" />}
    </button>
  );
}
