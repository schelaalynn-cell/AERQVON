/**
 * Blockchain transaction service — TON Connect integration.
 * Real transfers are gated behind config.securityReviewPassed.
 */

import type { Transaction } from '@/types';
import type { TransactionService, SendParams, TransactionDraft } from '@/services/interfaces';
import { buildTransferMessage, getValidUntilTimestamp, nanoToTon } from '@/services/ton/TonTransactionBuilder';
import { sendTransaction, getConnectedWallet } from '@/services/ton/TonConnectService';
import { TonApiService } from '@/services/ton/TonApiService';
import { config } from '@/config';
import { validateAmount } from '@/utils/amountValidation';
import { validateTonAddress } from '@/utils/addressValidation';
import './bufferPolyfill';
import { Cell } from '@ton/core';

const CONFIRMATION_POLL_INTERVAL_MS = 3000;
const CONFIRMATION_TIMEOUT_MS = 120000;

function cellHashToHex(bocBase64: string): string {
  const cell = Cell.fromBase64(bocBase64);
  const hash = cell.hash();
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((b: number) => b.toString(16).padStart(2, '0')).join('');
}

export class BlockchainTransactionService implements TransactionService {
  private _api: TonApiService;

  constructor(rpcUrl: string, apiKey?: string) {
    this._api = new TonApiService(rpcUrl, apiKey);
  }

  async getTransactions(address: string): Promise<Transaction[]> {
    if (!config.securityReviewPassed) return [];
    const tonTxs = await this._api.getTransactions(address, 50);
    const result: Transaction[] = [];
    for (const tx of tonTxs) {
      if (tx.in_msg && tx.in_msg.source && tx.in_msg.source !== address) {
        result.push({ id: tx.transaction_id.lt, txHash: tx.transaction_id.hash, assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: nanoToTon(tx.in_msg.value), usdValue: 0, direction: 'in', kind: 'receive', status: 'completed', timestamp: tx.utime * 1000, counterparty: tx.in_msg.source, memo: tx.in_msg.message || undefined });
      }
      for (const outMsg of tx.out_msgs) {
        if (outMsg.destination) {
          result.push({ id: tx.transaction_id.lt, txHash: tx.transaction_id.hash, assetId: 'GRAM', assetSymbol: 'GRAM', networkId: 'TON', amount: nanoToTon(outMsg.value), usdValue: 0, direction: 'out', kind: 'send', status: 'completed', timestamp: tx.utime * 1000, counterparty: outMsg.destination, memo: outMsg.message || undefined, fee: nanoToTon(tx.fee), feeAsset: 'GRAM' });
        }
      }
    }
    return result;
  }

  async getTransaction(txId: string): Promise<Transaction | null> {
    if (!config.securityReviewPassed) return null;
    const walletInfo = getConnectedWallet();
    if (!walletInfo) return null;
    const txs = await this.getTransactions(walletInfo.address);
    return txs.find((t) => t.id === txId || t.txHash === txId) ?? null;
  }

  prepareSend(params: SendParams): TransactionDraft {
    if (!config.securityReviewPassed) throw new Error('Transaction preparation is disabled until the security review is complete.');
    const addressInfo = validateTonAddress(params.recipient);
    if (!addressInfo.valid) throw new Error(`Invalid recipient address: ${addressInfo.error ?? 'validation failed'}`);
    const decimals = params.assetId === 'GRAM' ? 9 : 6;
    const amountCheck = validateAmount(params.amount, decimals, Number.MAX_SAFE_INTEGER, params.fee);
    if (!amountCheck.valid) throw new Error(amountCheck.error ?? 'Amount validation failed');
    return { assetId: params.assetId, assetSymbol: params.assetSymbol, networkId: params.networkId, amount: params.amount, recipient: params.recipient, fee: params.fee, total: params.amount + params.fee, state: 'awaiting_confirmation', warnings: [] };
  }

  async submitTransaction(draft: TransactionDraft): Promise<Transaction> {
    if (!config.securityReviewPassed) throw new Error('Transaction submission is disabled until the security review is complete.');
    const walletInfo = getConnectedWallet();
    if (!walletInfo) throw new Error('No wallet connected. Connect a wallet first.');
    const message = buildTransferMessage({ recipientAddress: draft.recipient, amountTon: draft.amount });
    const validUntil = getValidUntilTimestamp();
    const response = await sendTransaction([message], validUntil);
    const txHash = cellHashToHex(response.boc);
    const txId = `${Date.now()}-${txHash.slice(0, 16)}`;
    const pendingTx: Transaction = { id: txId, txHash, assetId: draft.assetId as Transaction['assetId'], assetSymbol: draft.assetSymbol, networkId: draft.networkId as Transaction['networkId'], amount: draft.amount, usdValue: 0, direction: 'out', kind: 'send', status: 'pending', timestamp: Date.now(), counterparty: draft.recipient, fee: draft.fee, feeAsset: draft.assetId as Transaction['assetId'] };
    await this.waitForConfirmation(walletInfo.address, txHash, pendingTx);
    return pendingTx;
  }

  private async waitForConfirmation(address: string, txHash: string, tx: Transaction): Promise<void> {
    const startTime = Date.now();
    return new Promise<void>((resolve) => {
      const poll = async () => {
        if (Date.now() - startTime > CONFIRMATION_TIMEOUT_MS) { tx.status = 'failed'; resolve(); return; }
        const txs = await this._api.getTransactions(address, 20);
        const found = txs.some((t) => t.transaction_id.hash === txHash);
        if (found) { tx.status = 'completed'; resolve(); }
        else setTimeout(poll, CONFIRMATION_POLL_INTERVAL_MS);
      };
      setTimeout(poll, CONFIRMATION_POLL_INTERVAL_MS);
    });
  }
}
