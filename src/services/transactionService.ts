import type { Transaction, TransactionDirection, TransactionKind, TransactionStatus } from '@/types';
import { ASSETS, walletService } from './walletService';

const SEED_TXS: Transaction[] = [
  {
    id: 'tx-001',
    txHash: 'EQd8f2k9s8fM4pQ3rT7vX2cB1nH6yL5jK4gW0eR8uY3aZb9c1',
    assetId: 'GRAM',
    assetSymbol: 'GRAM',
    networkId: 'TON',
    amount: 25.0,
    usdValue: 35.5,
    direction: 'in',
    kind: 'receive',
    status: 'completed',
    timestamp: Date.now() - 3600000 * 5,
    counterparty: 'EQB1nH6yL5jK4gW0eR8uY3aZb9c8d2f1k',
    memo: 'Coffee refund',
  },
  {
    id: 'tx-002',
    txHash: 'EQa3k9s8fM4pQ3rT7vX2cB1nH6yL5jK4gW0eR8uY3aZb9c2',
    assetId: 'GRAM',
    assetSymbol: 'GRAM',
    networkId: 'TON',
    amount: 5.0,
    usdValue: 7.1,
    direction: 'out',
    kind: 'send',
    status: 'completed',
    timestamp: Date.now() - 3600000 * 26,
    counterparty: 'EQC2mI7zK6lJ5hX1fS9uW4bA0oG3nN2pQ5rT8vY6',
    fee: 0.05,
    feeAsset: 'GRAM',
  },
  {
    id: 'tx-003',
    txHash: 'EQb4l0t9u8gN5oR4sU8wX3dC2oI7nM3pL6jK1hG9fZ7',
    assetId: 'USDT',
    assetSymbol: 'USDT',
    networkId: 'TON',
    amount: 50.0,
    usdValue: 50.0,
    direction: 'in',
    kind: 'receive',
    status: 'completed',
    timestamp: Date.now() - 3600000 * 48,
    counterparty: 'EQD3nJ8mK7lI6hG5fS4tU9wX2cB1oN0pQ5rT8vY',
  },
  {
    id: 'tx-004',
    txHash: 'EQc5m1u0v9hO6pS5tV9xY4eD3pJ8nN4qM7kL2iH0gA8',
    assetId: 'GRAM',
    assetSymbol: 'GRAM',
    networkId: 'TON',
    amount: 120.0,
    usdValue: 170.4,
    direction: 'out',
    kind: 'send',
    status: 'pending',
    timestamp: Date.now() - 3600000 * 2,
    counterparty: 'EQE4oK9nL8mJ7iH6gT5uV0wX3cB2oN1pQ6rS9tZ',
    fee: 0.05,
    feeAsset: 'GRAM',
  },
  {
    id: 'tx-005',
    txHash: 'EQd6n2v3w0iP7qT6uW0yZ5fE4qK9oO5rN8lM3jI1bB9',
    assetId: 'GRAM',
    assetSymbol: 'GRAM',
    networkId: 'TON',
    amount: 30.0,
    usdValue: 42.6,
    direction: 'out',
    kind: 'send',
    status: 'failed',
    timestamp: Date.now() - 3600000 * 72,
    counterparty: 'EQF5pL0oM9nK8jI7hU6vW1xY4cB3oN2pQ7rS0tZ',
    fee: 0.05,
    feeAsset: 'GRAM',
    memo: 'Insufficient gas',
  },
  {
    id: 'tx-006',
    txHash: 'EQe7o3w4x1jQ8rU7vX1zA6gF5lL0pP6sO9mN4kJ2cC0',
    assetId: 'USDT',
    assetSymbol: 'USDT',
    networkId: 'TON',
    amount: 100.0,
    usdValue: 100.0,
    direction: 'in',
    kind: 'receive',
    status: 'completed',
    timestamp: Date.now() - 3600000 * 96,
    counterparty: 'EQG6qM1pN0oL9jK8iV7wW2xY5cB4oO3pQ8rS1tZ',
  },
];

let txStore: Transaction[] = [...SEED_TXS];

function getTransactions(): Transaction[] {
  return [...txStore].sort((a, b) => b.timestamp - a.timestamp);
}

function getTransaction(id: string): Transaction | undefined {
  return txStore.find((t) => t.id === id);
}

interface SendParams {
  assetId: string;
  assetSymbol: string;
  networkId: string;
  amount: number;
  recipient: string;
  fee: number;
}

function sendTransaction(params: SendParams): Transaction {
  const tx: Transaction = {
    id: 'tx-' + Math.random().toString(36).slice(2, 10),
    txHash: 'EQ' + Math.random().toString(36).slice(2, 46),
    assetId: params.assetId as Transaction['assetId'],
    assetSymbol: params.assetSymbol,
    networkId: params.networkId as Transaction['networkId'],
    amount: params.amount,
    usdValue: 0,
    direction: 'out',
    kind: 'send',
    status: 'pending',
    timestamp: Date.now(),
    counterparty: params.recipient,
    fee: params.fee,
    feeAsset: params.assetId as Transaction['assetId'],
  };

  txStore = [tx, ...txStore];
  walletService.adjustBalance(params.assetId, -(params.amount + params.fee));

  // Simulate confirmation after a short delay
  setTimeout(() => {
    const found = txStore.find((t) => t.id === tx.id);
    if (found) found.status = 'completed';
  }, 4000);

  return tx;
}

interface SwapTxParams {
  fromAssetId: string;
  toAssetId: string;
  fromAmount: number;
  toAmount: number;
  fee: number;
}

interface TradeTxParams {
  pairSymbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  baseAsset: string;
  quoteAsset: string;
  baseAmount: number;
  quoteAmount: number;
  fee: number;
  execPrice: number;
}

function addTradeTransaction(params: TradeTxParams): Transaction {
  const primaryAsset = params.side === 'buy' ? params.quoteAsset : params.baseAsset;
  const primaryAmount = params.side === 'buy' ? params.quoteAmount : params.baseAmount;

  const tx: Transaction = {
    id: 'trade-' + Math.random().toString(36).slice(2, 10),
    txHash: 'CEX-' + Math.random().toString(36).slice(2, 46),
    assetId: primaryAsset as Transaction['assetId'],
    assetSymbol: primaryAsset,
    networkId: ASSETS.find((asset) => asset.id === primaryAsset)?.networkId ?? 'TON',
    amount: primaryAmount,
    usdValue: 0,
    direction: params.side === 'buy' ? 'in' : 'out',
    kind: 'trade',
    status: 'completed',
    timestamp: Date.now(),
    swapFrom: params.side === 'buy'
      ? params.quoteAsset as Transaction['assetId']
      : params.baseAsset as Transaction['assetId'],
    swapTo: params.side === 'buy'
      ? params.baseAsset as Transaction['assetId']
      : params.quoteAsset as Transaction['assetId'],
    swapFromAmount: params.side === 'buy' ? params.quoteAmount : params.baseAmount,
    swapToAmount: params.side === 'buy' ? params.baseAmount : params.quoteAmount,
    fee: params.fee,
    feeAsset: params.baseAsset as Transaction['assetId'],
    memo: `CEX ${params.type} ${params.pairSymbol} @ ${params.execPrice}`,
  };

  txStore = [tx, ...txStore];

  if (params.side === 'buy') {
    walletService.adjustBalance(params.quoteAsset, -params.quoteAmount);
    walletService.adjustBalance(params.baseAsset, params.baseAmount - params.fee);
  } else {
    walletService.adjustBalance(
      params.baseAsset,
      -(params.baseAmount + params.fee),
    );
    walletService.adjustBalance(params.quoteAsset, params.quoteAmount);
  }

  return tx;
}

function addSwapTransaction(params: SwapTxParams): Transaction {
  const tx: Transaction = {
    id: 'tx-' + Math.random().toString(36).slice(2, 10),
    txHash: 'EQ' + Math.random().toString(36).slice(2, 46),
    assetId: params.fromAssetId as Transaction['assetId'],
    assetSymbol: params.fromAssetId,
    networkId: 'TON',
    amount: params.fromAmount,
    usdValue: 0,
    direction: 'swap',
    kind: 'swap',
    status: 'completed',
    timestamp: Date.now(),
    swapFrom: params.fromAssetId as Transaction['assetId'],
    swapTo: params.toAssetId as Transaction['assetId'],
    swapFromAmount: params.fromAmount,
    swapToAmount: params.toAmount,
    fee: params.fee,
    feeAsset: params.fromAssetId as Transaction['assetId'],
  };

  txStore = [tx, ...txStore];
  walletService.adjustBalance(params.fromAssetId, -params.fromAmount);
  walletService.adjustBalance(params.toAssetId, params.toAmount);

  return tx;
}

function getStatusHistory(_id: string): { status: TransactionStatus; at: number }[] {
  return [{ status: 'pending', at: Date.now() }];
}

export type { SendParams, SwapTxParams, TradeTxParams };
export type TxStatus = TransactionStatus;
export type TxDirection = TransactionDirection;
export type TxKind = TransactionKind;

export const transactionService = {
  getTransactions,
  getTransaction,
  sendTransaction,
  addSwapTransaction,
  addTradeTransaction,
  getStatusHistory,
};
