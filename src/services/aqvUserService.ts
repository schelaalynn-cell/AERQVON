import { getSupabaseClient } from '@/services/authService';

export async function getAqvUserId(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from('aqv_user_profiles')
    .select('aqv_user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.aqv_user_id ?? null;
}
