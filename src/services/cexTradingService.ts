/**
 * AERQVON Trading Service (DEMO)
 * Handles market/limit orders, order book, trade history, locked balances, and P/L.
 */

import type { LockedBalance, Order, OrderSide, TradeHistoryEntry } from '@/types';
import { generateId } from '@/utils/secureId';
import { walletService } from './walletService';
import { marketService } from './marketService';
import { transactionService } from './transactionService';
import { config } from '@/config';
import { dbSync } from './dbSync';

const MAKER_FEE = 0.001;
const TAKER_FEE = 0.002;
const MIN_ORDER_USD = 1;
const MAX_SLIPPAGE = 0.003;

let orderStore: Order[] = [];
let tradeHistoryStore: TradeHistoryEntry[] = [];
let lockedBalances: LockedBalance[] = [];

interface Position { pairSymbol: string; baseAsset: string; avgBuyPrice: number; totalBaseAmount: number; }
const positions: Map<string, Position> = new Map();

function getPair(symbol: string) { return marketService.getPair(symbol); }
function getTradeFee(_pairSymbol: string, _side: OrderSide, amount: number): number { return amount * TAKER_FEE; }
function getLockedBalances(): LockedBalance[] { return [...lockedBalances]; }

function getAvailableBalance(assetId: string): number {
  const balance = walletService.getBalance(assetId);
  if (!balance) return 0;
  const locked = lockedBalances.filter((l) => l.assetId === assetId).reduce((sum, l) => sum + l.amount, 0);
  return Math.max(0, balance.amount - locked);
}

function lockBalance(assetId: string, amount: number, reason: string): void {
  lockedBalances.push({ assetId: assetId as LockedBalance['assetId'], amount, reason });
}

function unlockBalance(assetId: string, amount: number): void {
  let remaining = amount;
  lockedBalances = lockedBalances.filter((l) => {
    if (l.assetId !== assetId || remaining <= 0) return true;
    if (l.amount <= remaining) { remaining -= l.amount; return false; }
    l.amount -= remaining; remaining = 0; return true;
  });
}

function updatePositionOnBuy(pairSymbol: string, baseAsset: string, amount: number, price: number): void {
  const existing = positions.get(pairSymbol);
  if (existing) {
    const totalCost = existing.avgBuyPrice * existing.totalBaseAmount + price * amount;
    existing.totalBaseAmount += amount;
    existing.avgBuyPrice = totalCost / existing.totalBaseAmount;
  } else {
    positions.set(pairSymbol, { pairSymbol, baseAsset, avgBuyPrice: price, totalBaseAmount: amount });
  }
}

function calculateRealizedPnl(pairSymbol: string, amount: number, price: number): number {
  const pos = positions.get(pairSymbol);
  if (!pos || pos.totalBaseAmount <= 0) return 0;
  const pnl = (price - pos.avgBuyPrice) * amount;
  pos.totalBaseAmount -= amount;
  if (pos.totalBaseAmount <= 0) positions.delete(pairSymbol);
  return pnl;
}

function calculateUnrealizedPnl(pairSymbol: string): number {
  const pos = positions.get(pairSymbol);
  if (!pos || pos.totalBaseAmount <= 0) return 0;
  const pair = getPair(pairSymbol);
  if (!pair || pair.lastPrice <= 0) return 0;
  return (pair.lastPrice - pos.avgBuyPrice) * pos.totalBaseAmount;
}

function getTotalRealizedPnl(): number {
  return orderStore.filter((o) => o.status === 'filled' && o.realizedPnl !== undefined).reduce((sum, o) => sum + (o.realizedPnl ?? 0), 0);
}

function getTotalUnrealizedPnl(): number {
  let total = 0;
  for (const pos of positions.values()) total += calculateUnrealizedPnl(pos.pairSymbol);
  return total;
}

function isMarketDataValid(symbol: string): boolean {
  const pair = getPair(symbol);
  if (!pair) return false;
  if (pair.status === 'demo') return pair.lastPrice > 0;
  const lastFetch = marketService.getLastFetchTs();
  if (lastFetch === 0) return false;
  if (pair.lastPrice <= 0) return false;
  return Date.now() - lastFetch < 120000;
}

function placeMarketOrder(pairSymbol: string, side: OrderSide, amount: number): Order {
  const pair = getPair(pairSymbol);
  if (!pair) throw new Error(`Unknown trading pair: ${pairSymbol}`);
  if (!isMarketDataValid(pairSymbol)) throw new Error('Market data unavailable. Prices may be stale. Please wait and try again.');
  if (amount <= 0) throw new Error('Order amount must be greater than 0');
  const usdValue = amount * pair.lastPrice;
  if (usdValue < MIN_ORDER_USD) throw new Error(`Minimum order value is $${MIN_ORDER_USD}. Current value: $${usdValue.toFixed(2)}`);

  const slippage = pair.status === 'demo' ? 0.001 : MAX_SLIPPAGE;
  const execPrice = side === 'buy' ? pair.lastPrice * (1 + slippage) : pair.lastPrice * (1 - slippage);
  const baseAmount = amount;
  const quoteAmount = amount * execPrice;
  const fee = baseAmount * TAKER_FEE;

  if (side === 'buy') {
    const availableQuote = getAvailableBalance(pair.quoteAsset);
    if (quoteAmount > availableQuote) throw new Error(`Insufficient ${pair.quoteLabel} balance. Need ${quoteAmount.toFixed(2)}, available ${availableQuote.toFixed(2)}`);
  } else {
    const availableBase = getAvailableBalance(pair.baseAsset);
    if (baseAmount > availableBase) throw new Error(`Insufficient ${pair.baseLabel} balance. Need ${baseAmount.toFixed(4)}, available ${availableBase.toFixed(4)}`);
  }

  let realizedPnl: number | undefined;
  if (side === 'sell') realizedPnl = calculateRealizedPnl(pairSymbol, baseAmount, execPrice);
  else updatePositionOnBuy(pairSymbol, pair.baseAsset, baseAmount, execPrice);

  const order: Order = { id: generateId('cex-order'), pairSymbol, side, type: 'market', price: execPrice, amount: baseAmount, total: quoteAmount, fee, feeAsset: pair.baseAsset, status: 'filled', createdAt: Date.now(), filledAt: Date.now(), filledPrice: execPrice, filledAmount: baseAmount, realizedPnl };
  orderStore = [order, ...orderStore];
  tradeHistoryStore = [{ id: order.id, pairSymbol, side, type: 'market', price: execPrice, amount: baseAmount, total: quoteAmount, fee, feeAsset: pair.baseAsset, timestamp: Date.now(), mode: 'cex' }, ...tradeHistoryStore];
  transactionService.addTradeTransaction({ pairSymbol, side, type: 'market', baseAsset: pair.baseAsset, quoteAsset: pair.quoteAsset, baseAmount, quoteAmount, fee, execPrice });
  dbSync.order(order, 'web');
  dbSync.trade(order.id, pairSymbol, side, 'market', execPrice, baseAmount, quoteAmount, fee, pair.baseAsset, 'web');
  dbSync.notification('order_executed', 'Order Executed', `${pairSymbol}\n${side.toUpperCase()}\nMARKET\nExecuted: ${baseAmount.toFixed(4)} ${pair.baseLabel}\nPrice: ${execPrice.toFixed(execPrice < 1 ? 4 : 2)}\nFee: ${fee.toFixed(6)} ${pair.baseLabel}`);
  return order;
}

function placeLimitOrder(pairSymbol: string, side: OrderSide, amount: number, price: number): Order {
  const pair = getPair(pairSymbol);
  if (!pair) throw new Error(`Unknown trading pair: ${pairSymbol}`);
  if (amount <= 0) throw new Error('Order amount must be greater than 0');
  if (price <= 0) throw new Error('Limit price must be greater than 0');
  const usdValue = amount * price;
  if (usdValue < MIN_ORDER_USD) throw new Error(`Minimum order value is $${MIN_ORDER_USD}. Current value: $${usdValue.toFixed(2)}`);

  const baseAmount = amount;
  const quoteAmount = amount * price;
  const fee = baseAmount * MAKER_FEE;

  if (side === 'buy') {
    const availableQuote = getAvailableBalance(pair.quoteAsset);
    if (quoteAmount > availableQuote) throw new Error(`Insufficient ${pair.quoteLabel} balance. Need ${quoteAmount.toFixed(2)}, available ${availableQuote.toFixed(2)}`);
    lockBalance(pair.quoteAsset, quoteAmount, `Limit buy ${pairSymbol}`);
  } else {
    const availableBase = getAvailableBalance(pair.baseAsset);
    if (baseAmount > availableBase) throw new Error(`Insufficient ${pair.baseLabel} balance. Need ${baseAmount.toFixed(4)}, available ${availableBase.toFixed(4)}`);
    lockBalance(pair.baseAsset, baseAmount, `Limit sell ${pairSymbol}`);
  }

  const order: Order = { id: generateId('cex-order'), pairSymbol, side, type: 'limit', price, amount: baseAmount, total: quoteAmount, fee, feeAsset: pair.baseAsset, status: 'open', createdAt: Date.now() };
  orderStore = [order, ...orderStore];
  dbSync.order(order, 'web');
  dbSync.notification('order_submitted', 'Limit Order Placed', `${pairSymbol}\n${side.toUpperCase()}\nLIMIT\nPrice: ${price.toFixed(price < 1 ? 4 : 2)}\nAmount: ${baseAmount.toFixed(4)} ${pair.baseLabel}`);
  return order;
}

function cancelOrder(orderId: string): boolean {
  const order = orderStore.find((o) => o.id === orderId);
  if (!order || order.status !== 'open') return false;
  order.status = 'cancelled';
  const pair = getPair(order.pairSymbol);
  if (pair) {
    if (order.side === 'sell') unlockBalance(pair.baseAsset, order.amount);
    else unlockBalance(pair.quoteAsset, order.total);
  }
  dbSync.updateOrder(order.id, { status: 'cancelled' });
  dbSync.notification('order_cancelled', 'Order Cancelled', `${order.pairSymbol}\n${order.side.toUpperCase()}\nAmount: ${order.amount.toFixed(4)}`);
  return true;
}

function executeLimitOrder(order: Order): void {
  const pair = getPair(order.pairSymbol);
  if (!pair) return;
  if (order.side === 'buy') unlockBalance(pair.quoteAsset, order.total);
  else unlockBalance(pair.baseAsset, order.amount);

  const execPrice = order.price;
  const baseAmount = order.amount;
  const quoteAmount = order.amount * execPrice;
  const fee = baseAmount * MAKER_FEE;

  let realizedPnl: number | undefined;
  if (order.side === 'sell') realizedPnl = calculateRealizedPnl(order.pairSymbol, baseAmount, execPrice);
  else updatePositionOnBuy(order.pairSymbol, pair.baseAsset, baseAmount, execPrice);

  order.status = 'filled';
  order.filledAt = Date.now();
  order.filledPrice = execPrice;
  order.filledAmount = baseAmount;
  order.realizedPnl = realizedPnl;

  tradeHistoryStore = [{ id: order.id, pairSymbol: order.pairSymbol, side: order.side, type: 'limit', price: execPrice, amount: baseAmount, total: quoteAmount, fee, feeAsset: pair.baseAsset, timestamp: Date.now(), mode: 'cex' }, ...tradeHistoryStore];
  transactionService.addTradeTransaction({ pairSymbol: order.pairSymbol, side: order.side, type: 'limit', baseAsset: pair.baseAsset, quoteAsset: pair.quoteAsset, baseAmount, quoteAmount, fee, execPrice });
  dbSync.updateOrder(order.id, { status: 'filled', filledPrice: execPrice, filledAmount: baseAmount, realizedPnl, filledAt: Date.now() });
  dbSync.trade(order.id, order.pairSymbol, order.side, 'limit', execPrice, baseAmount, quoteAmount, fee, pair.baseAsset, 'web');
  dbSync.notification('limit_filled', 'Limit Order Filled', `${order.pairSymbol}\n${order.side.toUpperCase()}\nPrice: ${execPrice.toFixed(execPrice < 1 ? 4 : 2)}\nAmount: ${baseAmount.toFixed(4)} ${pair.baseLabel}`);
}

function checkLimitOrders(): { filled: number; orders: Order[] } {
  const filledOrders: Order[] = [];
  const openOrders = orderStore.filter((o) => o.status === 'open');
  for (const order of openOrders) {
    const pair = getPair(order.pairSymbol);
    if (!pair || pair.lastPrice <= 0) continue;
    let shouldFill = false;
    if (order.side === 'buy' && pair.lastPrice <= order.price) shouldFill = true;
    else if (order.side === 'sell' && pair.lastPrice >= order.price) shouldFill = true;
    if (shouldFill) { executeLimitOrder(order); filledOrders.push(order); }
  }
  return { filled: filledOrders.length, orders: filledOrders };
}

function getOpenOrders(): Order[] { return orderStore.filter((o) => o.status === 'open').sort((a, b) => b.createdAt - a.createdAt); }
function getOrderHistory(): Order[] { return orderStore.filter((o) => o.status !== 'open').sort((a, b) => (b.filledAt ?? b.createdAt) - (a.filledAt ?? a.createdAt)); }
function getTradeHistory(): TradeHistoryEntry[] { return [...tradeHistoryStore].sort((a, b) => b.timestamp - a.timestamp); }
function getAllOrders(): Order[] { return [...orderStore].sort((a, b) => b.createdAt - a.createdAt); }
function getOrder(id: string): Order | undefined { return orderStore.find((o) => o.id === id); }

export const cexTradingService = {
  placeMarketOrder, placeLimitOrder, cancelOrder, checkLimitOrders,
  getOpenOrders, getOrderHistory, getTradeHistory, getAllOrders, getOrder,
  getTradeFee, getTotalRealizedPnl, getTotalUnrealizedPnl, calculateUnrealizedPnl,
  getLockedBalances, getAvailableBalance, isMarketDataValid,
};

export const isDemoMode = config.demoMode;
