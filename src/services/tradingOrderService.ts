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
