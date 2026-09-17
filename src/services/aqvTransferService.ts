import { getSupabaseClient } from '@/services/authService';

export interface AqvTransferResult {
  id: string;
  recipientAqvUserId: string;
  assetId: string;
  amount: number;
  fee: number;
  status: 'completed' | 'failed';
  createdAt: string;
}

export async function transferTokensByAqvId(params: {
  recipientAqvUserId: string;
  assetId: string;
  amount: number;
  note?: string;
}): Promise<AqvTransferResult> {
  const recipientAqvUserId = params.recipientAqvUserId.trim().toUpperCase();
  if (!/^AQV-[A-Z0-9]{8}$/.test(recipientAqvUserId)) {
    throw new Error('Enter a valid AERQVON User ID (AQV-XXXXXXXX).');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('Amount must be greater than zero.');
  }

  const idempotencyKey = crypto.randomUUID();
  const { data, error } = await getSupabaseClient().rpc('transfer_tokens_by_aqv_id', {
    p_recipient_aqv_id: recipientAqvUserId,
    p_asset_id: params.assetId,
    p_amount: params.amount,
    p_idempotency_key: idempotencyKey,
    p_note: params.note?.trim() || null,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Transfer did not return a result.');

  return {
    id: data.id,
    recipientAqvUserId: data.recipient_aqv_user_id,
    assetId: data.asset_id,
    amount: Number(data.amount),
    fee: Number(data.fee),
    status: data.status,
    createdAt: data.created_at,
  };
}
