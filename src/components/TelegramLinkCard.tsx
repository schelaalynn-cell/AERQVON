import { useEffect, useState } from 'react';
import { Check, Link2, Unlink, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useUi } from '@/hooks/useUi';
import { telegramService } from '@/services/telegramService';
import { getLinkedTelegramIdentity, linkTelegramAccount, unlinkTelegramAccount, type TelegramIdentity } from '@/services/telegramLinkService';

export function TelegramLinkCard() {
  const { haptic } = useUi();
  const [identity, setIdentity] = useState<TelegramIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLinkedTelegramIdentity()
      .then((value) => { if (active) setIdentity(value); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : 'Could not load Telegram link.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const link = async () => {
    setWorking(true); setMessage(null); haptic('light');
    try {
      const value = await linkTelegramAccount();
      setIdentity(value);
      haptic('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Telegram linking failed.');
      haptic('error');
    } finally { setWorking(false); }
  };

  const unlink = async () => {
    setWorking(true); setMessage(null); haptic('light');
    try {
      await unlinkTelegramAccount();
      setIdentity(null);
      haptic('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Telegram unlinking failed.');
      haptic('error');
    } finally { setWorking(false); }
  };

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-nova-dim">Telegram</h2>
      <Card className="p-4">
        {loading ? <p className="text-xs text-nova-muted">Checking Telegram connection…</p> : identity ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nova-success/15"><Check className="h-4 w-4 text-nova-success" /></div><div className="flex-1"><p className="text-sm font-semibold">Telegram connected</p><p className="text-xs text-nova-muted">{identity.telegram_username ? `@${identity.telegram_username}` : `Telegram ID ${identity.telegram_user_id}`}</p></div></div>
            <button onClick={unlink} disabled={working} className="flex w-full items-center justify-center gap-2 rounded-xl bg-nova-surface-2 py-2.5 text-xs font-medium text-nova-muted disabled:opacity-50"><Unlink className="h-3.5 w-3.5" />{working ? 'Disconnecting…' : 'Disconnect Telegram'}</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl bg-nova-surface-2 px-3 py-2.5"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-nova-accent" /><p className="text-[11px] leading-relaxed text-nova-muted">Connect your verified Telegram account to your authenticated AERQVON account. The connection is verified server-side.</p></div>
            <button onClick={link} disabled={working || !telegramService.isAvailable()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-nova-accent py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Link2 className="h-3.5 w-3.5" />{working ? 'Connecting…' : telegramService.isAvailable() ? 'Connect Telegram' : 'Open AERQVON in Telegram'}</button>
          </div>
        )}
        {message && <div className="mt-3 flex items-start gap-2 rounded-xl bg-nova-error/10 px-3 py-2.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-nova-error" /><p className="text-[11px] leading-relaxed text-nova-muted">{message}</p></div>}
      </Card>
    </div>
  );
}
