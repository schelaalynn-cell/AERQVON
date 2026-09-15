/**
 * Fire-and-forget wrapper for database sync calls.
 * All methods are async but never throw — they log errors silently
 * so trading operations are never blocked by sync failures.
 */

import type { Order } from '@/types';
import {
  syncOrderToDb,
  updateOrderInDb,
  syncTradeToDb,
  createNotification,
  syncBalancesToDb,
} from './dbSyncService';

export const dbSync = {
  order(order: Order, source: 'web'): void {
    syncOrderToDb({
      id: order.id,
      pairSymbol: order.pairSymbol,
      side: order.side,
      type: order.type,
      price: order.price,
      amount: order.amount,
      total: order.total,
      fee: order.fee,
      feeAsset: order.feeAsset,
      status: order.status,
      source,
      filledPrice: order.filledPrice,
      filledAmount: order.filledAmount,
      realizedPnl: order.realizedPnl,
      createdAt: order.createdAt,
      filledAt: order.filledAt,
    }).catch((e) => console.error('dbSync.order failed:', e));
  },

  updateOrder(orderId: string, updates: {
    status?: string;
    filledPrice?: number;
    filledAmount?: number;
    realizedPnl?: number;
    filledAt?: number;
  }): void {
    updateOrderInDb(orderId, updates).catch((e) => console.error('dbSync.updateOrder failed:', e));
  },

  trade(
    orderId: string,
    pairSymbol: string,
    side: string,
    type: string,
    price: number,
    amount: number,
    total: number,
    fee: number,
    feeAsset: string,
    source: 'web',
  ): void {
    syncTradeToDb({
      orderId,
      pairSymbol,
      side,
      type,
      price,
      amount,
      total,
      fee,
      feeAsset,
      source,
      createdAt: Date.now(),
    }).catch((e) => console.error('dbSync.trade failed:', e));
  },

  notification(type: string, title: string, body: string): void {
    createNotification(type, title, body).catch((e) => console.error('dbSync.notification failed:', e));
  },

  balances(balances: { assetId: string; amount: number }[]): void {
    syncBalancesToDb(balances).catch((e) => console.error('dbSync.balances failed:', e));
  },
};
