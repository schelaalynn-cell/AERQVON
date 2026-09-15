/**
 * TON Connect integration service.
 * Manages the connection lifecycle to external TON wallets via the TON Connect protocol.
 * The app never handles private keys — the external wallet signs transactions.
 */

import './bufferPolyfill';
import {
  TonConnect,
  type TonConnectOptions,
  type Wallet as TonConnectWallet,
  type SendTransactionRequest,
  type SendTransactionResponse,
} from '@tonconnect/sdk';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ConnectedWalletInfo {
  address: string;
  publicKey: string;
  walletStateInit: string;
  provider: string;
}

export interface TonConnectMessage {
  address: string;
  amount: string;
  payload?: string;
}

const MANIFEST_URL = '/tonconnect-manifest.json';

let tonConnect: TonConnect | null = null;
let connectingState = false;

function getTonConnect(): TonConnect {
  if (!tonConnect) {
    const options: TonConnectOptions = { manifestUrl: MANIFEST_URL };
    tonConnect = new TonConnect(options);
  }
  return tonConnect;
}

function walletToInfo(wallet: TonConnectWallet): ConnectedWalletInfo {
  return {
    address: wallet.account.address,
    publicKey: wallet.account.publicKey ?? '',
    walletStateInit: wallet.account.walletStateInit,
    provider: wallet.device.appName,
  };
}

export function getConnectionStatus(): ConnectionStatus {
  const tc = getTonConnect();
  if (tc.connected && tc.wallet) return 'connected';
  if (connectingState) return 'connecting';
  return 'disconnected';
}

export function getConnectedWallet(): ConnectedWalletInfo | null {
  const tc = getTonConnect();
  if (!tc.connected || !tc.wallet) return null;
  return walletToInfo(tc.wallet);
}

export async function connectWallet(): Promise<ConnectedWalletInfo> {
  const tc = getTonConnect();
  if (tc.connected && tc.wallet) return walletToInfo(tc.wallet);

  const wallets = await tc.getWallets();
  if (wallets.length === 0) {
    throw new Error('No TON Connect wallets available. Install Tonkeeper or MyTonWallet.');
  }

  return new Promise<ConnectedWalletInfo>((resolve, reject) => {
    connectingState = true;
    const unsubscribe = tc.onStatusChange((wallet: TonConnectWallet | null) => {
      if (wallet) {
        connectingState = false;
        unsubscribe();
        resolve(walletToInfo(wallet));
      }
    }, (err: Error) => {
      connectingState = false;
      unsubscribe();
      reject(err);
    });

    tc.connect(wallets[0]);

    setTimeout(() => {
      connectingState = false;
      unsubscribe();
      reject(new Error('TON Connect timeout — wallet did not respond within 60 seconds.'));
    }, 60000);
  });
}

export async function disconnectWallet(): Promise<void> {
  const tc = getTonConnect();
  if (tc.connected) await tc.disconnect();
}

export async function sendTransaction(
  messages: TonConnectMessage[],
  validUntil: number,
): Promise<SendTransactionResponse> {
  const tc = getTonConnect();
  if (!tc.connected || !tc.wallet) {
    throw new Error('No wallet connected. Connect a wallet first.');
  }

  const request: SendTransactionRequest = {
    validUntil,
    messages: messages.map((m) => ({
      address: m.address,
      amount: m.amount,
      payload: m.payload,
    })),
  };

  return await tc.sendTransaction(request);
}

export { getTonConnect };
