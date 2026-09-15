/**
 * TON transaction message builder.
 *
 * Constructs BOC-encoded transfer messages using @ton/core for the TON Connect
 * protocol. Messages are validated before being sent to the connected wallet.
 */

import './bufferPolyfill';
import { beginCell, toNano, type Cell } from '@ton/core';
import { validateTonAddress } from '@/utils/addressValidation';

export interface TransferMessageInput {
  recipientAddress: string;
  amountTon: number;
  memo?: string;
}

export interface TonConnectMessage {
  address: string;
  amount: string;
  payload?: string;
}

const VALID_UNTIL_SECONDS = 180;

export function buildTransferMessage(input: TransferMessageInput): TonConnectMessage {
  const { recipientAddress, amountTon, memo } = input;

  if (!recipientAddress || typeof recipientAddress !== 'string') {
    throw new Error('Recipient address is required');
  }

  const addressInfo = validateTonAddress(recipientAddress);
  if (!addressInfo.valid) {
    throw new Error(`Invalid recipient address: ${addressInfo.error ?? 'validation failed'}`);
  }

  if (!Number.isFinite(amountTon) || amountTon <= 0) {
    throw new Error('Amount must be a positive finite number');
  }

  const amountNano = toNano(amountTon.toFixed(9)).toString();

  let payload: string | undefined;
  if (memo && memo.trim().length > 0) {
    const cell: Cell = beginCell().storeUint(0, 32).storeStringTail(memo.trim()).endCell();
    payload = cell.toBoc().toString('base64');
  }

  return {
    address: recipientAddress,
    amount: amountNano,
    payload,
  };
}

export function getValidUntilTimestamp(): number {
  return Math.floor(Date.now() / 1000) + VALID_UNTIL_SECONDS;
}

export function nanoToTon(nano: string): number {
  const value = BigInt(nano);
  const divisor = BigInt(1e9);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(9, '0');
  return parseFloat(`${whole.toString()}.${fractionStr}`);
}
