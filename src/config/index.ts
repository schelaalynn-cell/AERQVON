function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

const DEMO_MODE = parseBoolean(import.meta.env.VITE_DEMO_MODE, true);

const SECURITY_REVIEW_PASSED = parseBoolean(
  import.meta.env.VITE_SECURITY_REVIEW_PASSED,
  false,
);

const AQV_SOLANA_MINT_ADDRESS = import.meta.env.VITE_AQV_SOLANA_MINT_ADDRESS?.trim() ?? '';

export const APP_NAME = 'AERQVON';
export const APP_TAGLINE = 'Crypto Wallet & Spot Trading';

export const config = {
  appName: APP_NAME,
  demoMode: DEMO_MODE,
  securityReviewPassed: SECURITY_REVIEW_PASSED,
  aqvSolanaMintAddress: AQV_SOLANA_MINT_ADDRESS,
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  tonRpcUrl: import.meta.env.VITE_TON_RPC_URL ?? 'https://toncenter.com/api/v2',
  tonApiKey: import.meta.env.VITE_TON_API_KEY ?? '',
  marketDataApiUrl: import.meta.env.VITE_MARKET_DATA_API_URL ?? (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''),
} as const;

export type AppConfig = typeof config;
