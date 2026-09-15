/**
 * AERQVON Order Service (DEMO)
 *
 * Provides order management: listing, filtering, and cancellation.
 * Delegates order storage to CEXTradingService.
 */

import type { Order } from '@/types';
import { cexTradingService } from './cexTradingService';

function getOrders(): Order[] {
  return cexTradingService.getAllOrders();
}

function getOpenOrders(): Order[] {
  return cexTradingService.getOpenOrders();
}

function getOrderHistory(): Order[] {
  return cexTradingService.getOrderHistory();
}

function getOrder(id: string): Order | undefined {
  return cexTradingService.getOrder(id);
}

function cancelOrder(id: string): boolean {
  return cexTradingService.cancelOrder(id);
}

export const orderService = {
  getOrders,
  getOpenOrders,
  getOrderHistory,
  getOrder,
  cancelOrder,
};
