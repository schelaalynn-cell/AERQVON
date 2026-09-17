import { getSupabaseClient } from '@/services/authService';
import { telegramService } from '@/services/telegramService';

export interface TelegramIdentity {
  id: string;
  user_id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
  linked_at: string;
  updated_at: string;
}

export async function getLinkedTelegramIdentity(): Promise<TelegramIdentity | null> {
  const { data, error } = await getSupabaseClient()
    .from('telegram_identities')
    .select('id,user_id,telegram_user_id,telegram_username,first_name,last_name,language_code,linked_at,updated_at')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as TelegramIdentity | null;
}

export async function linkTelegramAccount(): Promise<TelegramIdentity> {
  const initData = telegramService.getInitData();
  if (!initData) {
    throw new Error('Open AERQVON inside Telegram to link your Telegram account.');
  }

  const { data, error } = await getSupabaseClient().functions.invoke('telegram-link', {
    body: { initData },
  });
  if (error) throw new Error(error.message);
  if (!data?.linked || !data.identity) throw new Error(data?.error ?? 'Telegram linking failed.');
  return data.identity as TelegramIdentity;
}

export async function unlinkTelegramAccount(): Promise<void> {
  const { error } = await getSupabaseClient().from('telegram_identities').delete().not('id', 'is', null);
  if (error) throw new Error(error.message);
}
