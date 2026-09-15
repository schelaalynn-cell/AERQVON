/**
 * Demo wallet provider.
 * Generates a clearly-labeled demo wallet with a fixed address.
 * Does NOT generate real private keys, seed phrases, or blockchain addresses.
 * Uses secure random for the internal wallet ID only.
 */

import type { Wallet } from '@/types';
import type { WalletProvider, WalletConnectionType } from '@/services/interfaces';
import { generateId } from '@/utils/secureId';

const DEMO_ADDRESS = 'EQDk2ZvN9s8fM4pQ3rT7vX2cB1nH6yL5jK4gW0eR8uY3aZb';

export class DemoWalletProvider implements WalletProvider {
  readonly type: WalletConnectionType = 'demo';
  readonly isDemo = true;

  private wallet: Wallet | null = null;

  async createWallet(): Promise<Wallet> {
    this.wallet = {
      id: generateId('nova'),
      address: DEMO_ADDRESS,
      label: 'Nova Demo Wallet',
      createdAt: Date.now(),
      balances: [],
    };
    return this.wallet;
  }

  async importWallet(_mnemonic: string): Promise<Wallet> {
    throw new Error('Wallet import is not available in demo mode. Real key management is required for import.');
  }

  async connectExternal(): Promise<Wallet> {
    throw new Error('External wallet connection is not available in demo mode.');
  }

  getWallet(): Wallet | null {
    return this.wallet;
  }

  isImportSupported(): boolean {
    return false;
  }
}
