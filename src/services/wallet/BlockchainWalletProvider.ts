/**
 * Blockchain wallet provider — TON Connect integration.
 * The app never creates or stores private keys — it delegates signing to the user's external wallet.
 */

import type { Wallet } from '@/types';
import type { WalletProvider, WalletConnectionType } from '@/services/interfaces';
import { connectWallet, getConnectedWallet, type ConnectedWalletInfo } from '@/services/ton/TonConnectService';
import { config } from '@/config';

function walletInfoToWallet(info: ConnectedWalletInfo): Wallet {
  return {
    id: `ton-connect-${info.publicKey.slice(0, 16)}`,
    address: info.address,
    label: info.provider,
    createdAt: Date.now(),
    balances: [],
  };
}

export class BlockchainWalletProvider implements WalletProvider {
  readonly type: WalletConnectionType = 'ton-connect';
  readonly isDemo = false;

  async createWallet(): Promise<Wallet> {
    throw new Error('This app does not create wallets. Use "Connect Wallet" to link an external TON wallet via TON Connect.');
  }

  async importWallet(_mnemonic: string): Promise<Wallet> {
    throw new Error('This app does not import private keys. Use "Connect Wallet" to link an external TON wallet via TON Connect.');
  }

  async connectExternal(): Promise<Wallet> {
    if (!config.securityReviewPassed) {
      throw new Error('TON Connect is integrated but real wallet connections are disabled until the security review is complete.');
    }
    const info = await connectWallet();
    return walletInfoToWallet(info);
  }

  getWallet(): Wallet | null {
    const info = getConnectedWallet();
    if (!info) return null;
    return walletInfoToWallet(info);
  }

  isImportSupported(): boolean { return false; }
}
