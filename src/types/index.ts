export type NetworkId = 'TON' | 'BTC' | 'ETH' | 'SOL' | 'BSC';
export type AssetId = 'GRAM' | 'USDT' | 'BTC' | 'ETH' | 'AQV' | 'BNB' | 'USDC';
export type AssetType = 'native' | 'jetton' | 'simulated' | 'spl' | 'bep20' | 'erc20';

export interface Network {
  id: NetworkId;
  name: string;
  shortName: string;
  nativeAssetId: AssetId;
  isLive: boolean;
}

export interface Asset {
  id: AssetId;
  name: string;
  symbol: string;
  networkId: NetworkId;
  networkName: string;
  type: AssetType;
  decimals: number;
  isSimulated: boolean;
  color: string;
  priceUsd: number;
  change24h: number;
  launchStatus?: 'live' | 'pre-launch';
  officialMintAddress?: string;
}

export interface Balance {
  assetId: AssetId;
  amount: number;
  usdValue: number;
}

export interface Wallet {
  id: string;
  address: string;
  label: string;
  createdAt: number;
  balances: Balance[];
}

export type TransactionDirection = 'in' | 'out' | 'swap';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type TransactionKind = 'send' | 'receive' | 'swap';

export interface Transaction {
  id: string;
  txHash: string;
  assetId: AssetId;
  assetSymbol: string;
  networkId: NetworkId;
  amount: number;
  usdValue: number;
  direction: TransactionDirection;
  kind: TransactionKind;
  status: TransactionStatus;
  timestamp: number;
  counterparty?: string;
  memo?: string;
  swapFrom?: AssetId;
  swapTo?: AssetId;
  swapFromAmount?: number;
  swapToAmount?: number;
  fee?: number;
  feeAsset?: AssetId;
}

export interface SwapQuote {
  fromAssetId: AssetId;
  toAssetId: AssetId;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  networkFee: number;
  feeAsset: AssetId;
  slippage: number;
  minReceived: number;
  priceImpact: number;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

export interface AppUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  isPremium?: boolean;
  languageCode?: string;
}

export interface PortfolioSummary {
  totalUsd: number;
  change24hUsd: number;
  change24hPct: number;
}

export type TradingMode = 'cex' | 'dex';

export interface LockedBalance {
  assetId: AssetId;
  amount: number;
  reason: string;
}

export interface TradeHistoryEntry {
  id: string;
  pairSymbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  fee: number;
  feeAsset: AssetId;
  timestamp: number;
  mode: TradingMode;
}

export interface DexRoute {
  path: AssetId[];
  hops: number;
  pools: string[];
  estimatedOutput: number;
  priceImpact: number;
}

export interface DexQuote {
  fromAssetId: AssetId;
  toAssetId: AssetId;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  route: DexRoute;
  priceImpact: number;
  slippage: number;
  minReceived: number;
  networkFee: number;
  feeAsset: AssetId;
  liquidityUsd: number;
}

export interface LiquidityPool {
  id: string;
  token0: AssetId;
  token1: AssetId;
  reserve0: number;
  reserve1: number;
  totalLiquidityUsd: number;
  apr: number;
  fee: number;
}

export type DexTxStatus = 'idle' | 'preparing' | 'pending' | 'confirmed' | 'failed';

export interface DexTransaction {
  id: string;
  fromAssetId: AssetId;
  toAssetId: AssetId;
  fromAmount: number;
  toAmount: number;
  route: DexRoute;
  status: DexTxStatus;
  timestamp: number;
  networkFee: number;
  slippage: number;
  minReceived: number;
}

export type Currency = 'USD' | 'EUR' | 'RUB';
export type Language = 'en' | 'ru';
export type ThemeMode = 'dark' | 'light' | 'system';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type OrderStatus = 'open' | 'filled' | 'cancelled' | 'partial';

export interface TradingPair {
  symbol: string;
  baseAsset: AssetId;
  quoteAsset: AssetId;
  baseLabel: string;
  quoteLabel: string;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  status: 'live' | 'pre-launch' | 'demo';
}

export interface Order {
  id: string;
  pairSymbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  fee: number;
  feeAsset: AssetId;
  status: OrderStatus;
  source: 'web';
  filledPrice?: number;
  filledAmount?: number;
  realizedPnl?: number;
  createdAt: number;
  filledAt?: number;
}

export interface Candlestick {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
