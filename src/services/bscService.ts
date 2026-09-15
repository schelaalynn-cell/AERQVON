/**
 * AERQVON BSC Service (DEMO)
 *
 * Abstraction layer for BNB Smart Chain network operations.
 * In demo mode, all operations are simulated and clearly labeled.
 * Prepared for future integration with real BSC RPC nodes and DEX contracts.
 */

import type { AssetId, NetworkId } from '@/types';
import { config } from '@/config';

const BSC_CHAIN_ID = 56;
const BSC_RPC_URL = 'https://bsc-dataseed.binance.org';

const BSC_NATIVE_ASSET: AssetId = 'BNB';
const BSC_TOKENS: AssetId[] = ['AQV', 'BNB', 'USDC', 'USDT'];

const DEMO_BSC_ADDRESS = '0xDemoAerqvonWalletAddress00000000000000000000';

function getChainId(): number {
  return BSC_CHAIN_ID;
}

function getRpcUrl(): string {
  return BSC_RPC_URL;
}

function getNetworkId(): NetworkId {
  return 'BSC';
}

function getNativeAsset(): AssetId {
  return BSC_NATIVE_ASSET;
}

function getSupportedTokens(): AssetId[] {
  return [...BSC_TOKENS];
}

function isTokenSupported(assetId: AssetId): boolean {
  return BSC_TOKENS.includes(assetId);
}

function getGasEstimate(_fromAssetId: AssetId, _toAssetId: AssetId): number {
  return 0.001;
}

function getDemoAddress(): string {
  return DEMO_BSC_ADDRESS;
}

function isLive(): boolean {
  return !config.demoMode;
}

export const bscService = {
  getChainId,
  getRpcUrl,
  getNetworkId,
  getNativeAsset,
  getSupportedTokens,
  isTokenSupported,
  getGasEstimate,
  getDemoAddress,
  isLive,
};

export const isDemoMode = config.demoMode;
