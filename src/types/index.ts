export type BetTier = 'SHARK' | 'WHALE' | 'MEGA_WHALE';
export type BetSide = 'YES' | 'NO';
export type BetResult = 'OPEN' | 'WON' | 'LOST';

export interface Wallet {
  address: string;
  firstTradeAt: string | null;
  lifetimeTrades: number;
  createdAt: string;
  updatedAt: string;
}

export interface Market {
  id: string;
  title: string;
  slug: string | null;
  currentOddsYes: number | null;
  currentOddsNo: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlaggedBet {
  id: string;
  walletAddress: string;
  marketId: string;
  tier: BetTier;
  sizeUsd: number;
  odds: number;
  side: BetSide;
  alertScore: number;
  result: BetResult;
  pnl: number | null;
  txHash: string | null;
  clusterId: string | null;
  betAt: string;
  flaggedAt: string;
  createdAt: string;
  marketTitle?: string; // Hydrated field
  lifetimeTrades?: number; // Hydrated field
  isNew?: boolean; // Runtime animation flag
}

export interface Cluster {
  id: string;
  marketId: string;
  side: BetSide;
  oddsAtFlag: number;
  aggregateSize: number;
  memberCount: number;
  windowMinutes: number;
  detectedAt: string;
  createdAt: string;
  marketTitle?: string; // Hydrated field
}

export interface ClusterMember {
  id: string;
  clusterId: string;
  walletAddress: string;
  flaggedBetId: string;
  sizeUsd: number;
  betAt: string;
  note: string | null;
}

export interface FeedMetrics {
  volume24h: number;
  volumeDelta: string; // e.g. "+14.2%"
  newWalletsToday: number;
  hottestMarket: { title: string; betCount: number } | null;
  biggestBetAllTime: number;
}

export interface FeedResponse {
  bets: FlaggedBet[];
  metrics: FeedMetrics;
  activeCluster: Cluster | null;
  tierCounts: {
    all: number;
    SHARK: number;
    WHALE: number;
    MEGA_WHALE: number;
  };
}

export interface WalletBet extends FlaggedBet {
  marketTitle: string;
}

export interface WalletResponse {
  address: string;
  firstTradeAt: string | null;
  lifetimeTrades: number;
  bets: WalletBet[];
  hitRate: number; // 0 to 100
  realizedPnl: number;
  suspicionScore: number; // 0 to 99
  inCluster: boolean;
  clusterId: string | null;
  cumulativePnlSeries: { date: string; pnl: number }[]; // for Recharts area/line chart
}

export interface ClusterDetailMember {
  walletAddress: string;
  size: number;
  betAt: string;
  note: string | null;
}

export interface ClusterResponse {
  id: string;
  market: { id: string; title: string };
  side: BetSide;
  oddsAtFlag: number;
  aggregateSize: number;
  memberCount: number;
  windowMinutes: number;
  detectedAt: string;
  members: ClusterDetailMember[];
}
