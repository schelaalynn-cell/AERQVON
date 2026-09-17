/**
 * AERQVON Database Sync Service
 * Persists authenticated user's trading state in Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';
import { getCurrentUser, getSupabaseClient } from '@/services/authService';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  client = getSupabaseClient();
  return client;
}

async function getUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function syncBalancesToDb(balances: { assetId: string; amount: number }[]): Promise<void> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return;

  const rows = balances.map((b) => ({
    user_id: userId,
    asset_id: b.assetId,
    amount: b.amount,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from('trading_balances').upsert(rows, { onConflict: 'user_id,asset_id' });
  if (error) console.error('Failed to sync balances:', error.message);
}

export async function fetchBalancesFromDb(): Promise<Map<string, number> | null> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return null;
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await sb
    .from('trading_balances')
    .select('asset_id, amount')
    .eq('user_id', userId);
  if (error || !data) return null;

  const map = new Map<string, number>();
  for (const row of data) map.set(row.asset_id, Number(row.amount));
  return map;
}

export async function syncOrderToDb(order: { id: string; pairSymbol: string; side: string; type: string; price: number; amount: number; total: number; fee: number; feeAsset: string; status: string; source: string; filledPrice?: number; filledAmount?: number; realizedPnl?: number; createdAt: number; filledAt?: number }): Promise<void> {
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await sb.from('trading_orders').insert({
    id: order.id,
    user_id: userId,
    pair_symbol: order.pairSymbol,
    side: order.side,
    type: order.type,
    price: order.price,
    amount: order.amount,
    total: order.total,
    fee: order.fee,
    fee_asset: order.feeAsset,
    status: order.status,
    source: order.source,
    filled_price: order.filledPrice ?? null,
    filled_amount: order.filledAmount ?? null,
    realized_pnl: order.realizedPnl ?? null,
    created_at: new Date(order.createdAt).toISOString(),
    filled_at: order.filledAt ? new Date(order.filledAt).toISOString() : null,
  });
  if (error) console.error('Failed to sync order:', error.message);
}

export async function updateOrderInDb(orderId: string, updates: { status?: string; filledPrice?: number; filledAmount?: number; realizedPnl?: number; filledAt?: number }): Promise<void> {
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return;

  const update: Record<string, unknown> = {};
  if (updates.status !== undefined) update.status = updates.status;
  if (updates.filledPrice !== undefined) update.filled_price = updates.filledPrice;
  if (updates.filledAmount !== undefined) update.filled_amount = updates.filledAmount;
  if (updates.realizedPnl !== undefined) update.realized_pnl = updates.realizedPnl;
  if (updates.filledAt !== undefined) update.filled_at = new Date(updates.filledAt).toISOString();

  const { error } = await sb.from('trading_orders').update(update).eq('id', orderId).eq('user_id', userId);
  if (error) console.error('Failed to update order:', error.message);
}

export async function syncTradeToDb(trade: { orderId?: string; pairSymbol: string; side: string; type: string; price: number; amount: number; total: number; fee: number; feeAsset: string; source: string; createdAt: number }): Promise<void> {
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await sb.from('trading_trades').insert({
    order_id: trade.orderId ?? null,
    user_id: userId,
    pair_symbol: trade.pairSymbol,
    side: trade.side,
    type: trade.type,
    price: trade.price,
    amount: trade.amount,
    total: trade.total,
    fee: trade.fee,
    fee_asset: trade.feeAsset,
    source: trade.source,
    created_at: new Date(trade.createdAt).toISOString(),
  });
  if (error) console.error('Failed to sync trade:', error.message);
}

export async function createNotification(type: string, title: string, body: string): Promise<void> {
  const sb = getClient();
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await sb.from('trading_notifications').insert({
    user_id: userId,
    session_id: 'auth',
    type,
    title,
    body,
    sent: false,
  });
  if (error) console.error('Failed to create notification:', error.message);
}

export async function pollForExternalChanges(): Promise<{ balancesChanged: boolean; newBalances: Map<string, number> | null } | null> {
  const balances = await fetchBalancesFromDb();
  if (!balances) return null;
  return { balancesChanged: true, newBalances: balances };
}
