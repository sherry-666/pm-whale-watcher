import { BetTier } from '../types';

/**
 * Classifies a bet into a tier based on USD size and odds.
 * Returns null if the bet does not qualify as a flagged bet.
 */
export function classifyTier(sizeUsd: number, odds: number): BetTier | null {
  if (sizeUsd >= 500000 && odds < 0.20) {
    return 'MEGA_WHALE';
  }
  if (sizeUsd >= 100000 && odds < 0.25) {
    return 'WHALE';
  }
  if (sizeUsd >= 25000 && odds < 0.30) {
    return 'SHARK';
  }
  return null;
}

/**
 * Computes an alert score from 40 to 99 based on tier, size, odds, and wallet freshness.
 */
export function computeAlertScore(
  tier: BetTier,
  sizeUsd: number,
  odds: number,
  lifetimeTrades: number
): number {
  const tierWeights = {
    MEGA_WHALE: 40,
    WHALE: 30,
    SHARK: 20,
  };
  const tierWeight = tierWeights[tier];

  // Odds bonus: low probability = higher score. Max 30 points.
  const rarityBonus = Math.max(0, Math.floor(((0.30 - odds) / 0.30) * 30));

  // Freshness bonus: fewer lifetime trades = higher score. Max 18 points.
  // Clamp lifetimeTrades to 5 max since that's our freshness threshold.
  const clampedTrades = Math.min(5, Math.max(1, lifetimeTrades));
  const freshnessBonus = ((5 - clampedTrades) / 5) * 18;

  // Size bonus: logarithmic scale, max 12 points.
  const sizeBonus = Math.min(12, (Math.log10(sizeUsd) / 6) * 12);

  const total = tierWeight + rarityBonus + freshnessBonus + sizeBonus;
  return Math.max(40, Math.min(99, Math.round(total)));
}

/**
 * Computes the overall suspicion score (0 to 99) for a wallet.
 */
export function computeSuspicionScore(
  bets: { alertScore: number }[],
  lifetimeTrades: number,
  inCluster: boolean
): number {
  if (bets.length === 0) return 0;
  
  // Base is the average alert score of the wallet's flagged bets
  const avgAlert = bets.reduce((sum, b) => sum + b.alertScore, 0) / bets.length;
  
  // Cluster bonus: coordination increases suspicion significantly (+20)
  const clusterBonus = inCluster ? 20 : 0;
  
  // History penalty: more experience/history reduces suspicion (-15 if trades >= 5)
  const historyPenalty = lifetimeTrades >= 5 ? 15 : 0;

  const total = avgAlert + clusterBonus - historyPenalty;
  return Math.max(10, Math.min(99, Math.round(total)));
}
