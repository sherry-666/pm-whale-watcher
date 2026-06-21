/* eslint-disable @typescript-eslint/no-explicit-any */
import WebSocket from 'ws';
import mongoose from 'mongoose';
import { dbConnect } from './db';
import { Wallet, Market, FlaggedBet, Cluster, ClusterMember } from './models';
import { classifyTier, computeAlertScore } from './scoring';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Config constants
const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_BET_SIZE_USD = 25000;            // $25K
const CLUSTER_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const CLUSTER_MIN_WALLETS = 3;

// Active state mappings
interface TokenMapping {
  marketId: string;
  side: 'YES' | 'NO';
  odds: number;
}

const tokenInfoMap = new Map<string, TokenMapping>();
let ws: WebSocket | null = null;
let pollingTimeout: NodeJS.Timeout | null = null;

// Clean exit handlers
process.on('SIGINT', async () => {
  console.log('Ingestion daemon stopping...');
  if (pollingTimeout) clearTimeout(pollingTimeout);
  if (ws) ws.close();
  await mongoose.disconnect();
  process.exit(0);
});

async function main() {
  await dbConnect();
  console.log('Successfully connected to database. Starting Ingestion Daemon...');
  
  // Start the sync cycle
  await syncAndRun();
}

/**
 * Main polling/sync coordinator
 */
async function syncAndRun() {
  try {
    console.log('\n--- Sync Cycle Started ---');
    const tokenIds = await fetchActiveLowOddsTokens();
    console.log(`Discovered ${tokenIds.length} active low-odds outcome tokens.`);

    if (tokenIds.length > 0) {
      startWebSocket(tokenIds);
    } else {
      console.warn('No low-odds markets found. Re-polling in 5 minutes.');
    }
  } catch (err) {
    console.error('Error in sync cycle:', err);
  }

  // Schedule next polling cycle
  pollingTimeout = setTimeout(syncAndRun, POLLING_INTERVAL_MS);
}

/**
 * Fetches active markets from Gamma API and filters low-odds outcomes
 */
async function fetchActiveLowOddsTokens(): Promise<string[]> {
  const url = 'https://gamma-api.polymarket.com/markets?active=true&limit=150';
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gamma API returned status ${res.status}`);
    
    const markets: any[] = await res.json();
    const activeTokens: string[] = [];
    tokenInfoMap.clear();

    for (const m of markets) {
      if (!m.conditionId || !m.outcomePrices || !m.clobTokenIds) {
        continue;
      }

      const conditionId = m.conditionId.toLowerCase();
      let pricesArray: any[] = [];
      let clobTokenIdsArray: string[] = [];

      try {
        pricesArray = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
        clobTokenIdsArray = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
      } catch {
        continue;
      }

      if (!Array.isArray(pricesArray) || !Array.isArray(clobTokenIdsArray) || clobTokenIdsArray.length < 2) {
        continue;
      }

      const prices = pricesArray.map((p: any) => parseFloat(p));

      const category = classifyCategory(m.question || '', m.slug || '', m.feeType || '');

      // Save/update market details in MongoDB
      await Market.findByIdAndUpdate(
        conditionId,
        {
          _id: conditionId,
          title: m.question,
          slug: m.slug || '',
          eventSlug: m.events?.[0]?.slug || '',
          negRisk: !!m.negRisk,
          category,
          currentOddsYes: prices[0] || null,
          currentOddsNo: prices[1] || null,
          status: 'active',
        },
        { upsert: true, new: true }
      );

      // Inspect outcomes (YES = index 0, NO = index 1)
      prices.forEach((price: number, idx: number) => {
        if (price >= 0.02 && price <= 0.30) {
          const tokenId = clobTokenIdsArray[idx];
          if (tokenId) {
            activeTokens.push(tokenId);
            tokenInfoMap.set(tokenId, {
              marketId: conditionId,
              side: idx === 0 ? 'YES' : 'NO',
              odds: price,
            });
          }
        }
      });
    }

    return activeTokens;
  } catch (err) {
    console.error('Failed to fetch markets from Gamma:', err);
    return [];
  }
}

/**
 * Subscribes to the live trades WebSocket stream
 */
function startWebSocket(tokenIds: string[]) {
  if (ws) {
    console.log('Closing existing WebSocket connection to refresh subscriptions...');
    ws.close();
  }

  ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

  ws.on('open', () => {
    console.log('CLOB WebSocket stream opened. Subscribing to trade channel...');
    const payload = {
      type: 'market',
      assets_ids: tokenIds,
    };
    ws?.send(JSON.stringify(payload));
  });

  ws.on('message', async (data: string) => {
    try {
      const msg = JSON.parse(data);
      
      // We only listen for execution trades
      if (msg.event_type !== 'last_trade_price') return;

      const { asset_id, price, size, timestamp } = msg;
      const tokenMapping = tokenInfoMap.get(asset_id);
      if (!tokenMapping) return;

      const sizeShares = parseFloat(size);
      const executionPrice = parseFloat(price);
      const sizeUsd = sizeShares * executionPrice;

      // Filter by size threshold
      if (sizeUsd < MIN_BET_SIZE_USD) return;

      console.log(`[ALERT TRIGGER] Large trade on token ${asset_id}: $${Math.round(sizeUsd)} @ ${Math.round(executionPrice * 100)}% odds`);
      
      // Resolve the proxy wallet address
      const traderAddress = await resolveTraderAddress(asset_id, sizeShares, executionPrice, timestamp);
      if (!traderAddress) {
        console.warn(`Could not resolve trader wallet address for trade (size: ${sizeShares}, price: ${executionPrice})`);
        return;
      }

      console.log(`Resolved trader address: ${traderAddress}. Evaluating freshness profile...`);
      await evaluateAndFlag(traderAddress, tokenMapping.marketId, tokenMapping.side, sizeUsd, executionPrice, timestamp);
    } catch (err) {
      console.error('Error processing incoming WebSocket message:', err);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket stream encountered an error:', err);
  });

  ws.on('close', () => {
    console.log('CLOB WebSocket stream closed.');
  });
}

/**
 * Resolves proxyWallet using recent trades REST endpoint matching
 */
async function resolveTraderAddress(
  assetId: string,
  sizeShares: number,
  price: number,
  timestampStr: string
): Promise<string | null> {
  const url = `https://data-api.polymarket.com/trades?asset=${assetId}&limit=15`;
  const eventTimeMs = parseInt(timestampStr) * 1000;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const trades: any[] = await res.json();

    // Look for a trade with matching size and price within a 4-second time window
    const match = trades.find((t) => {
      const tradeTimeMs = new Date(t.timestamp).getTime();
      const timeDiff = Math.abs(tradeTimeMs - eventTimeMs);
      const sizeDiff = Math.abs(parseFloat(t.size) - sizeShares);

      return timeDiff <= 4000 && sizeDiff < 0.1 && parseFloat(t.price) === price;
    });

    return match ? (match.proxyWallet || match.user || null) : null;
  } catch (err) {
    console.error('Failed to resolve trader address from Data API:', err);
    return null;
  }
}

/**
 * Checks wallet trade history, performs scoring, and saves data to MongoDB
 */
async function evaluateAndFlag(
  address: string,
  marketId: string,
  side: 'YES' | 'NO',
  sizeUsd: number,
  odds: number,
  timestampStr: string
) {
  const addressLower = address.toLowerCase();
  const url = `https://data-api.polymarket.com/trades?user=${addressLower}&limit=20`;
  const betAt = new Date(parseInt(timestampStr) * 1000);

  try {
    const res = await fetch(url);
    if (!res.ok) return;

    const history: any[] = await res.json();
    const lifetimeTrades = history.length;

    // Freshness check: must have less than 5 trades
    if (lifetimeTrades >= 5) {
      console.log(`Wallet ${addressLower} has ${lifetimeTrades} trades (Not a fresh profile. Skip).`);
      return;
    }

    // Determine first trade time
    const firstTradeAt = history.length > 0 
      ? new Date(history[history.length - 1].timestamp) 
      : betAt;

    // Save/update Wallet details
    await Wallet.findByIdAndUpdate(
      addressLower,
      {
        _id: addressLower,
        firstTradeAt,
        lifetimeTrades,
      },
      { upsert: true, new: true }
    );

    // Classify tier
    const tier = classifyTier(sizeUsd, odds);
    if (!tier) return; // double check it qualifies

    // Compute alert score
    const score = computeAlertScore(tier, sizeUsd, odds, lifetimeTrades);

    // Create and save FlaggedBet
    const flaggedBet = new FlaggedBet({
      walletAddress: addressLower,
      marketId,
      tier,
      sizeUsd,
      odds,
      side,
      alertScore: score,
      result: 'OPEN',
      txHash: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''), // Mock tx hash
      betAt,
    });
    const savedBet = await flaggedBet.save();
    console.log(`[ALERT CREATED] Flagged ${tier} bet by fresh wallet ${addressLower}: $${Math.round(sizeUsd)} (Score: ${score})`);

    // Run Cluster coordination check
    await runClusterDetection(savedBet);

  } catch (err) {
    console.error(`Failed to evaluate wallet profile ${addressLower}:`, err);
  }
}

/**
 * Scans for coordination clusters on the same market outcome in a 60-minute window
 */
async function runClusterDetection(newBet: any) {
  const windowStart = new Date(newBet.betAt.getTime() - CLUSTER_WINDOW_MS);
  
  try {
    // Find all flagged bets on the same market & side within the 60-minute window
    const recentBets = await FlaggedBet.find({
      marketId: newBet.marketId,
      side: newBet.side,
      betAt: { $gte: windowStart, $lte: newBet.betAt },
    }).populate({ path: 'walletAddress', model: Wallet });

    // Filter to fresh wallets (trades < 5)
    const freshBets = recentBets.filter((b: any) => b.walletAddress && b.walletAddress.lifetimeTrades < 5);

    // Count unique wallets involved
    const uniqueWallets = Array.from(new Set(freshBets.map((b: any) => b.walletAddress._id)));

    if (uniqueWallets.length >= CLUSTER_MIN_WALLETS) {
      console.log(`[CLUSTER TRIGGER] Coordinated activity detected! ${uniqueWallets.length} fresh wallets on market ${newBet.marketId} (side: ${newBet.side})`);
      
      const aggregateSize = freshBets.reduce((sum, b) => sum + b.sizeUsd, 0);
      const memberCount = uniqueWallets.length;
      
      // Calculate precise window in minutes between the first and last trade in the cluster
      const sortedDates = freshBets.map((b) => b.betAt.getTime()).sort();
      const minDate = sortedDates[0];
      const maxDate = sortedDates[sortedDates.length - 1];
      const windowMinutes = Math.max(1, Math.round((maxDate - minDate) / (1000 * 60)));

      // 1. Create or update the Cluster document
      let cluster = await Cluster.findOne({
        marketId: newBet.marketId,
        side: newBet.side,
        detectedAt: { $gte: windowStart },
      });

      if (!cluster) {
        cluster = new Cluster({
          marketId: newBet.marketId,
          side: newBet.side,
          oddsAtFlag: newBet.odds,
          aggregateSize,
          memberCount,
          windowMinutes,
          detectedAt: new Date(),
        });
      } else {
        cluster.aggregateSize = aggregateSize;
        cluster.memberCount = memberCount;
        cluster.windowMinutes = windowMinutes;
      }
      const savedCluster = await cluster.save();

      // 2. Clear old members and write updated member list
      await ClusterMember.deleteMany({ clusterId: savedCluster._id });

      for (const bet of freshBets) {
        // Link flagged bet to the cluster
        await FlaggedBet.findByIdAndUpdate(bet._id, { clusterId: savedCluster._id });

        const member = new ClusterMember({
          clusterId: savedCluster._id,
          walletAddress: bet.walletAddress._id,
          flaggedBetId: bet._id,
          sizeUsd: bet.sizeUsd,
          betAt: bet.betAt,
          note: `Wallet trades: ${bet.walletAddress.lifetimeTrades}. Size: $${Math.round(bet.sizeUsd)} at ${Math.round(bet.odds * 100)}% odds.`,
        });
        await member.save();
      }
    }
  } catch (err) {
    console.error('Failed to run cluster detection:', err);
  }
}

/**
 * Classifies a Polymarket prediction into standard categories
 */
function classifyCategory(title: string, slug: string, feeType: string): string {
  const t = title.toLowerCase();
  const s = slug.toLowerCase();
  const f = (feeType || '').toLowerCase();

  // 1. FeeType direct classification
  if (f.includes('politics')) return 'Politics';
  if (f.includes('sports')) return 'Sports';
  if (f.includes('culture')) return 'Pop Culture';

  // 2. Keyword matching for Politics / Geopolitics
  if (
    t.includes('election') || s.includes('election') ||
    t.includes('president') || s.includes('president') ||
    t.includes('nomination') || s.includes('nomination') ||
    t.includes('trump') || s.includes('trump') ||
    t.includes('biden') || s.includes('biden') ||
    t.includes('harris') || s.includes('harris') ||
    t.includes('taiwan') || s.includes('taiwan') ||
    t.includes('invad') || s.includes('invad') ||
    t.includes('geopolitics') || s.includes('geopolitics') ||
    t.includes('russia') || s.includes('russia') ||
    t.includes('ukraine') || s.includes('ukraine') ||
    t.includes('china') || s.includes('china')
  ) {
    return 'Politics';
  }

  // 3. Keyword matching for Crypto
  if (
    t.includes('bitcoin') || s.includes('bitcoin') ||
    t.includes('btc') || s.includes('btc') ||
    t.includes('ethereum') || s.includes('ethereum') ||
    t.includes('eth') || s.includes('eth') ||
    t.includes('solana') || s.includes('solana') ||
    t.includes('crypto') || s.includes('crypto') ||
    t.includes('airdrop') || s.includes('airdrop') ||
    t.includes('token') || s.includes('token') ||
    t.includes('vitalik') || s.includes('vitalik') ||
    t.includes('megaeth') || s.includes('megaeth') ||
    t.includes('coin') || s.includes('coin')
  ) {
    return 'Crypto';
  }

  // 4. Keyword matching for Science & Tech
  if (
    t.includes('openai') || s.includes('openai') ||
    t.includes('chatgpt') || s.includes('chatgpt') ||
    t.includes('gpt') || s.includes('gpt') ||
    t.includes('ai ') || s.includes('ai-') || s.includes('-ai') ||
    t.includes('artificial intelligence') ||
    t.includes('starship') || s.includes('starship') ||
    t.includes('spacex') || s.includes('spacex') ||
    t.includes('nuclear') || s.includes('nuclear') ||
    t.includes('tech') || s.includes('tech')
  ) {
    return 'Science & Tech';
  }

  // 5. Keyword matching for Business & Finance
  if (
    t.includes('fed ') || t.includes('fed-') || s.includes('fed') ||
    t.includes('rate cut') || s.includes('rate-cut') ||
    t.includes('inflation') || s.includes('inflation') ||
    t.includes('cpi') || s.includes('cpi') ||
    t.includes('interest rate') || s.includes('interest-rate') ||
    t.includes('recession') || s.includes('recession') ||
    t.includes('stock') || s.includes('stock') ||
    t.includes('gdp') || s.includes('gdp')
  ) {
    return 'Business & Finance';
  }

  // 6. Keyword matching for Sports
  if (
    t.includes('world cup') || s.includes('world-cup') ||
    t.includes('fifa') || s.includes('fifa') ||
    t.includes('nba') || s.includes('nba') ||
    t.includes('nfl') || s.includes('nfl') ||
    t.includes('championship') || s.includes('championship') ||
    t.includes('matchup') || s.includes('matchup')
  ) {
    return 'Sports';
  }

  // 7. Keyword matching for Pop Culture
  if (
    t.includes('gta') || s.includes('gta') ||
    t.includes('rihanna') || s.includes('rihanna') ||
    t.includes('album') || s.includes('album') ||
    t.includes('carti') || s.includes('carti') ||
    t.includes('music') || s.includes('music') ||
    t.includes('celebrity') || s.includes('celebrity') ||
    t.includes('oscar') || s.includes('oscar') ||
    t.includes('weinstein') || s.includes('weinstein')
  ) {
    return 'Pop Culture';
  }

  // Default fallback
  return 'General';
}

main().catch((err) => {
  console.error('Failed to start ingestion service:', err);
  process.exit(1);
});
