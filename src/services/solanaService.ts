/**
 * AERQVON Solana Service (DEMO)
 *
 * Abstraction layer for Solana network operations.
 * In demo mode, all operations are simulated and clearly labeled.
 */

import type { AssetId, NetworkId } from '@/types';
import { config } from '@/config';

const SOLANA_CHAIN_ID = 0;
const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

const SOLANA_NATIVE_ASSET: AssetId = 'SOL';
const SOLANA_TOKENS: AssetId[] = ['AQV', 'SOL', 'USDC'];

const DEMO_SOLANA_ADDRESS = 'DemoSolanaWalletAddress0000000000000000000000';

function getChainId(): number {
  return SOLANA_CHAIN_ID;
}

function getRpcUrl(): string {
  return SOLANA_RPC_URL;
}

function getNetworkId(): NetworkId {
  return 'SOL';
}

function getNativeAsset(): AssetId {
  return SOLANA_NATIVE_ASSET;
}

function getSupportedTokens(): AssetId[] {
  return [...SOLANA_TOKENS];
}

function isTokenSupported(assetId: AssetId): boolean {
  return SOLANA_TOKENS.includes(assetId);
}

function getGasEstimate(_fromAssetId: AssetId, _toAssetId: AssetId): number {
  return 0.001;
}

function getDemoAddress(): string {
  return DEMO_SOLANA_ADDRESS;
}

function getAqvMintAddress(): string {
  return config.aqvSolanaMintAddress;
}

function isAqvLaunched(): boolean {
  return Boolean(config.aqvSolanaMintAddress);
}

function isLive(): boolean {
  return !config.demoMode;
}

export const solanaService = {
  getChainId,
  getRpcUrl,
  getNetworkId,
  getNativeAsset,
  getSupportedTokens,
  isTokenSupported,
  getGasEstimate,
  getDemoAddress,
  getAqvMintAddress,
  isAqvLaunched,
  isLive,
};

export const isDemoMode = config.demoMode;
