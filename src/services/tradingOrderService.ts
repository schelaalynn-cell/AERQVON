import { getSupabaseClient } from '@/services/authService';
import type { Order, OrderSide, OrderType } from '@/types';

export async function submitServerOrder(params: {
  pairSymbol: string;
  side: OrderSide;
  type: OrderType;
  amount: number;
  price?: number;
  clientOrderId?: string;
}): Promise<Order> {
  const symbol = params.pairSymbol.replace('/', '').toUpperCase();
  const { data, error } = await getSupabaseClient().functions.invoke('trading-order', {
    body: {
      marketType: 'spot',
      symbol,
      side: params.side,
      type: params.type,
      amount: params.amount,
      price: params.price ?? null,
      clientOrderId: params.clientOrderId ?? crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      reduceOnly: false,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.order) throw new Error(data?.error ?? 'Server did not return an order.');
  const row = data.order;
  return {
    id: row.id,
    pairSymbol: params.pairSymbol,
    side: row.side,
    type: row.type === 'stop_limit' || row.type === 'stop' ? 'limit' : row.type,
    price: Number(row.price ?? params.price ?? 0),
    amount: Number(row.amount),
    total: Number(row.total ?? 0),
    fee: Number(row.fee ?? 0),
    feeAsset: 'USDC',
    status: row.status === 'queued' ? 'queued' : row.status,
    source: 'web',
    createdAt: new Date(row.created_at ?? Date.now()).getTime(),
  };
}

export async function fetchServerOrders(): Promise<Order[]> {
  const { data, error } = await getSupabaseClient()
    .from('trading_orders')
    .select('id,pair_symbol,side,type,price,amount,total,fee,fee_asset,status,created_at,filled_at,filled_price,filled_amount,realized_pnl')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    pairSymbol: String(row.pair_symbol).includes('/') ? row.pair_symbol : String(row.pair_symbol),
    side: row.side,
    type: row.type === 'stop' || row.type === 'stop_limit' ? 'limit' : row.type,
    price: Number(row.price ?? 0),
    amount: Number(row.amount ?? 0),
    total: Number(row.total ?? 0),
    fee: Number(row.fee ?? 0),
    feeAsset: row.fee_asset ?? 'USDC',
    status: row.status,
    source: 'web',
    filledPrice: row.filled_price == null ? undefined : Number(row.filled_price),
    filledAmount: row.filled_amount == null ? undefined : Number(row.filled_amount),
    realizedPnl: row.realized_pnl == null ? undefined : Number(row.realized_pnl),
    createdAt: new Date(row.created_at).getTime(),
    filledAt: row.filled_at ? new Date(row.filled_at).getTime() : undefined,
  }));
}
