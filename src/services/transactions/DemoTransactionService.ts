/**
 * Demo transaction service.
 * Provides simulated transactions with clearly-labeled demo hashes.
 */

import type { Transaction } from '@/types';
import type { TransactionService, SendParams, TransactionDraft } from '@/services/interfaces';
import { generateId, generateHexId } from '@/utils/secureId';

const SEED_TXS: Transaction[] = [
  { id: 'tx-seed-001', txHash: 'DEMO-' + '0'.repeat(40), assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: 25.0, usdValue: 35.5, direction: 'in', kind: 'receive', status: 'completed', timestamp: Date.now() - 3600000 * 5, counterparty: 'EQB1nH6yL5jK4gW0eR8uY3aZb9c8d2f1k', memo: 'Coffee refund' },
  { id: 'tx-seed-002', txHash: 'DEMO-' + '1'.repeat(40), assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: 5.0, usdValue: 7.1, direction: 'out', kind: 'send', status: 'completed', timestamp: Date.now() - 3600000 * 26, counterparty: 'EQC2mI7zK6lJ5hX1fS9uW4bA0oG3nN2pQ5rT8vY6', fee: 0.05, feeAsset: 'GRAM' },
  { id: 'tx-seed-003', txHash: 'DEMO-' + '2'.repeat(40), assetId: 'USDT', assetSymbol: 'USDT', networkId: 'TON', amount: 50.0, usdValue: 50.0, direction: 'in', kind: 'receive', status: 'completed', timestamp: Date.now() - 3600000 * 48, counterparty: 'EQD3nJ8mK7lI6hG5fS4tU9wX2cB1oN0pQ5rT8vY' },
  { id: 'tx-seed-004', txHash: 'DEMO-' + '3'.repeat(40), assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: 120.0, usdValue: 170.4, direction: 'out', kind: 'send', status: 'pending', timestamp: Date.now() - 3600000 * 2, counterparty: 'EQE4oK9nL8mJ7iH6gT5uV0wX3cB2oN1pQ6rS9tZ', fee: 0.05, feeAsset: 'GRAM' },
  { id: 'tx-seed-005', txHash: 'DEMO-' + '4'.repeat(40), assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: 30.0, usdValue: 42.6, direction: 'out', kind: 'send', status: 'failed', timestamp: Date.now() - 3600000 * 72, counterparty: 'EQF5pL0oM9nK8jI7hU6vW1xY4cB3oN2pQ7rS0tZ', fee: 0.05, feeAsset: 'GRAM', memo: 'Insufficient gas' },
  { id: 'tx-seed-006', txHash: 'DEMO-' + '5'.repeat(40), assetId: 'USDT', assetSymbol: 'USDT', networkId: 'TON', amount: 100.0, usdValue: 100.0, direction: 'in', kind: 'receive', status: 'completed', timestamp: Date.now() - 3600000 * 96, counterparty: 'EQG6qM1pN0oL9jK8iV7wW2xY5cB4oO3pQ8rS1tZ' },
];

export class DemoTransactionService implements TransactionService {
  private txStore: Transaction[] = [...SEED_TXS];

  async getTransactions(_address: string): Promise<Transaction[]> {
    return [...this.txStore].sort((a, b) => b.timestamp - a.timestamp);
  }

  async getTransaction(txId: string): Promise<Transaction | null> {
    return this.txStore.find((t) => t.id === txId) ?? null;
  }

  prepareSend(params: SendParams): TransactionDraft {
    return { assetId: params.assetId, assetSymbol: params.assetSymbol, networkId: params.networkId, amount: params.amount, recipient: params.recipient, fee: params.fee, total: params.amount + params.fee, state: 'awaiting_confirmation', warnings: ['Demo mode: transaction will be simulated, not broadcast to the blockchain.'] };
  }

  async submitTransaction(draft: TransactionDraft): Promise<Transaction> {
    const tx: Transaction = {
      id: generateId('tx'), txHash: 'DEMO-' + generateHexId(40),
      assetId: draft.assetId as Transaction['assetId'], assetSymbol: draft.assetSymbol,
      networkId: draft.networkId as Transaction['networkId'], amount: draft.amount, usdValue: 0,
      direction: 'out', kind: 'send', status: 'pending', timestamp: Date.now(),
      counterparty: draft.recipient, fee: draft.fee, feeAsset: draft.assetId as Transaction['assetId'],
    };
    this.txStore = [tx, ...this.txStore];
    return tx;
  }
}
