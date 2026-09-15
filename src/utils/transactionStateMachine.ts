/**
 * Transaction lifecycle state machine.
 * draft → validated → awaiting_confirmation → signing → submitted → pending → confirmed
 * Any state can transition to: rejected, failed, expired, timeout
 */

export type TransactionState =
  | 'draft' | 'validated' | 'awaiting_confirmation' | 'signing'
  | 'submitted' | 'pending' | 'confirmed'
  | 'rejected' | 'failed' | 'expired' | 'timeout';

const VALID_TRANSITIONS: Record<TransactionState, TransactionState[]> = {
  draft: ['validated', 'rejected'],
  validated: ['awaiting_confirmation', 'rejected', 'expired'],
  awaiting_confirmation: ['signing', 'rejected', 'expired'],
  signing: ['submitted', 'rejected', 'failed'],
  submitted: ['pending', 'failed', 'timeout'],
  pending: ['confirmed', 'failed', 'timeout'],
  confirmed: [],
  rejected: [],
  failed: [],
  expired: [],
  timeout: [],
};

export function canTransition(from: TransactionState, to: TransactionState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function transition(from: TransactionState, to: TransactionState): TransactionState {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid transaction state transition: ${from} → ${to}`);
  }
  return to;
}

export function isTerminalState(state: TransactionState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

export function isConfirmed(state: TransactionState): boolean {
  return state === 'confirmed';
}

export function isPending(state: TransactionState): boolean {
  return ['draft', 'validated', 'awaiting_confirmation', 'signing', 'submitted', 'pending'].includes(state);
}

export function isFailed(state: TransactionState): boolean {
  return ['rejected', 'failed', 'expired', 'timeout'].includes(state);
}
