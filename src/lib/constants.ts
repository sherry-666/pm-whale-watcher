export const TIER_METADATA = {
  SHARK: {
    label: 'SHARK',
    description: 'Size ≥ $25K, Odds < 30%',
    textColor: 'text-ww-tier-shark',
    borderColor: 'border-ww-tier-shark',
    bgColor: 'bg-ww-tier-shark/10',
    colorHex: '#f5b942',
  },
  WHALE: {
    label: 'WHALE',
    description: 'Size ≥ $100K, Odds < 25%',
    textColor: 'text-ww-tier-whale',
    borderColor: 'border-ww-tier-whale',
    bgColor: 'bg-ww-tier-whale/10',
    colorHex: '#ff8f3f',
  },
  MEGA_WHALE: {
    label: 'MEGA_WHALE',
    description: 'Size ≥ $500K, Odds < 20%',
    textColor: 'text-ww-tier-mega',
    borderColor: 'border-ww-tier-mega',
    bgColor: 'bg-ww-tier-mega/10',
    colorHex: '#ff4d4d',
  },
} as const;

export const SIDE_METADATA = {
  YES: {
    label: 'YES',
    textColor: 'text-ww-side-yes',
    borderColor: 'border-ww-side-yes',
    bgColor: 'bg-ww-side-yes/10',
    colorHex: '#00e5a0',
  },
  NO: {
    label: 'NO',
    textColor: 'text-ww-side-no',
    borderColor: 'border-ww-side-no',
    bgColor: 'bg-ww-side-no/10',
    colorHex: '#ff5c7a',
  },
} as const;

export const SCORE_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
} as const;

export const CLUSTER_THRESHOLD_MINUTES = 60;
export const CLUSTER_MIN_MEMBERS = 3;
export const WALLET_FRESHNESS_MAX_TRADES = 5;
