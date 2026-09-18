import type { Asset, Balance, Network, Wallet } from '@/types';
import { getMarketQuote } from '@/services/market/marketState';

const DEMO_ADDRESS = 'EQDk2ZvN9s8fM4pQ3rT7vX2cB1nH6yL5jK4gW0eR8uY3aZb';

export const NETWORKS: Network[] = [
  {
    id: 'TON',
    name: 'The Open Network',
    shortName: 'TON',
    nativeAssetId: 'GRAM',
    isLive: true,
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    shortName: 'BTC',
    nativeAssetId: 'BTC',
    isLive: false,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    shortName: 'ETH',
    nativeAssetId: 'ETH',
    isLive: false,
  },
];

export const ASSETS: Asset[] = [
  {
    id: 'AQV',
    name: 'AERQVON Token',
    symbol: 'AQV',
    networkId: 'BSC',
    networkName: 'BSC',
    type: 'bep20',
    decimals: 18,
    isSimulated: true,
    color: '#5b8cff',
    priceUsd: 0.12,
    change24h: 0,
    launchStatus: 'pre-launch',
  },
  {
    id: 'GRAM',
    name: 'Gram',
    symbol: 'GRAM',
    networkId: 'TON',
    networkName: 'TON',
    type: 'native',
    decimals: 9,
    isSimulated: false,
    color: '#5b8cff',
    priceUsd: 1.42,
    change24h: 3.8,
  },
  {
    id: 'USDT',
    name: 'Tether USD',
    symbol: 'USDT',
    networkId: 'TON',
    networkName: 'TON',
    type: 'jetton',
    decimals: 6,
    isSimulated: false,
    color: '#26a17b',
    priceUsd: 1.0,
    change24h: 0.01,
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    symbol: 'BTC',
    networkId: 'BTC',
    networkName: 'Bitcoin',
    type: 'simulated',
    decimals: 8,
    isSimulated: true,
    color: '#f7931a',
    priceUsd: 64250,
    change24h: -1.2,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    networkId: 'ETH',
    networkName: 'Ethereum',
    type: 'simulated',
    decimals: 18,
    isSimulated: true,
    color: '#627eea',
    priceUsd: 3180,
    change24h: 2.4,
  },
];

const DEMO_BALANCES: Balance[] = [
  { assetId: 'GRAM', amount: 12480.5, usdValue: 0 },
  { assetId: 'USDT', amount: 2150.0, usdValue: 0 },
  { assetId: 'BTC', amount: 0.0184, usdValue: 0 },
  { assetId: 'ETH', amount: 0.74, usdValue: 0 },
  { assetId: 'AQV', amount: 0, usdValue: 0 },
];

let walletStore: Wallet = {
  id: 'aerqvon-demo-001',
  address: DEMO_ADDRESS,
  label: 'AERQVON Wallet',
  createdAt: Date.now() - 86400000 * 12,
  balances: DEMO_BALANCES,
};

function recomputeUsd(balances: Balance[]): Balance[] {
  return balances.map((b) => {
    const asset = ASSETS.find((a) => a.id === b.assetId);

    if (!asset) {
      return { ...b, usdValue: 0 };
    }

    const marketSymbol =
      b.assetId === 'AQV' ? 'AQV/USDC' : `${b.assetId}/USDC`;
    const liveQuote = getMarketQuote(marketSymbol);

    const priceUsd =
      liveQuote?.priceUsd != null
        ? liveQuote.priceUsd
        : asset.priceUsd;

    return {
      ...b,
      usdValue: b.amount * priceUsd,
    };
  });
}

function getWallet(): Wallet {
  return { ...walletStore, balances: recomputeUsd(walletStore.balances) };
}

function getAssets(): Asset[] {
  return ASSETS;
}

function getAsset(id: string): Asset | undefined {
  return ASSETS.find((a) => a.id === id);
}

function getNetworks(): Network[] {
  return NETWORKS;
}

function getNetwork(id: string): Network | undefined {
  return NETWORKS.find((n) => n.id === id);
}

function getBalance(assetId: string): Balance | undefined {
  return getWallet().balances.find((b) => b.assetId === assetId);
}

function getBalances(): Balance[] {
  return getWallet().balances;
}

function createWallet(): Wallet {
  walletStore = {
    id: 'aerqvon-' + Math.random().toString(36).slice(2, 10),
    address: 'EQD' + Math.random().toString(36).slice(2, 14) + 'aZb',
    label: 'AERQVON Wallet',
    createdAt: Date.now(),
    balances: [
      { assetId: 'GRAM', amount: 100, usdValue: 0 },
      { assetId: 'USDT', amount: 50, usdValue: 0 },
    ],
  };
  return getWallet();
}

function importWallet(): Wallet {
  // Real import is disabled in demo mode
  return createWallet();
}

function setBalance(assetId: string, amount: number): void {
  const existing = walletStore.balances.find((b) => b.assetId === assetId);
  if (existing) {
    existing.amount = amount;
  } else {
    walletStore.balances.push({ assetId: assetId as Balance['assetId'], amount, usdValue: 0 });
  }
}

function adjustBalance(assetId: string, delta: number): void {
  const existing = walletStore.balances.find((b) => b.assetId === assetId);
  if (existing) {
    existing.amount = Math.max(0, existing.amount + delta);
  } else if (delta > 0) {
    walletStore.balances.push({ assetId: assetId as Balance['assetId'], amount: delta, usdValue: 0 });
  }
}

function isValidAddress(address: string, _networkId: string): boolean {
  if (!address || address.length < 6) return false;
  return /^[EQU][A-Za-z0-9_-]{20,}$/.test(address) || /^0x[a-fA-F0-9]{40}$/.test(address) || /^bc1[a-z0-9]{20,}$/.test(address);
}

export const walletService = {
  getWallet,
  getAssets,
  getAsset,
  getNetworks,
  getNetwork,
  getBalance,
  getBalances,
  createWallet,
  importWallet,
  setBalance,
  adjustBalance,
  isValidAddress,
};
