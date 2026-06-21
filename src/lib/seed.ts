import mongoose from 'mongoose';
import { dbConnect } from './db';
import { Wallet, Market, FlaggedBet, Cluster, ClusterMember } from './models';
import { classifyTier, computeAlertScore } from './scoring';

// Ensure dotenv is parsed if run directly
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const MARKETS_MOCK = [
  { _id: 'm-1', title: 'Trump pardons crypto founder before Aug 1', slug: 'trump-pardons-crypto-founder', currentOddsYes: 0.12, currentOddsNo: 0.88, status: 'active' },
  { _id: 'm-2', title: 'US Bitcoin strategic reserve established in 2026', slug: 'us-btc-reserve-2026', currentOddsYes: 0.18, currentOddsNo: 0.82, status: 'active' },
  { _id: 'm-3', title: 'Fed cuts rates by 100bps or more in 2026', slug: 'fed-cuts-100bps-2026', currentOddsYes: 0.25, currentOddsNo: 0.75, status: 'active' },
  { _id: 'm-4', title: 'Gary Gensler resigns as SEC Chair before July 1', slug: 'gensler-resigns-july-1', currentOddsYes: 0.28, currentOddsNo: 0.72, status: 'active' },
  { _id: 'm-5', title: 'Solana ETF approved by SEC before Sept 1', slug: 'solana-etf-sept-1', currentOddsYes: 0.08, currentOddsNo: 0.92, status: 'active' },
  { _id: 'm-6', title: 'Apple announces direct ChatGPT competitor at WWDC', slug: 'apple-chatgpt-wwdc', currentOddsYes: 0.22, currentOddsNo: 0.78, status: 'active' },
  { _id: 'm-7', title: 'OpenAI announces GPT-5 in June 2026', slug: 'gpt5-june-2026', currentOddsYes: 0.15, currentOddsNo: 0.85, status: 'active' },
  { _id: 'm-8', title: 'Eminent domain declared on Bitcoin mining farm in 2026', slug: 'bitcoin-mining-eminent-domain', currentOddsYes: 0.04, currentOddsNo: 0.96, status: 'active' },
  { _id: 'm-9', title: 'Vitalik Buterin moves all ETH out of main wallet before Dec 31', slug: 'vitalik-moves-eth', currentOddsYes: 0.02, currentOddsNo: 0.98, status: 'active' },
  { _id: 'm-10', title: 'US inflation rate drops below 2% in July 2026', slug: 'inflation-below-2pct-july', currentOddsYes: 0.29, currentOddsNo: 0.71, status: 'active' },
];

const WALLETS_MOCK = [
  { _id: '0x3ef099e29a99723bfca850989f6655c65f2479e0', firstTradeAt: new Date(Date.now() - 4 * 24 * 3600 * 1000), lifetimeTrades: 3 },
  { _id: '0x8f2d57d727b140fa789b6b7720977e2db7ff26b2', firstTradeAt: new Date(Date.now() - 1 * 24 * 3600 * 1000), lifetimeTrades: 1 },
  { _id: '0xa0c330fcf214b789b6b872d97a9f66ccf247ffbe', firstTradeAt: new Date(Date.now() - 2 * 3600 * 1000), lifetimeTrades: 1 },
  { _id: '0xd7a9f666f214b7e8d7a33ef0999e2f6b87f2ffcc', firstTradeAt: new Date(Date.now() - 1 * 3600 * 1000), lifetimeTrades: 1 },
  { _id: '0x992455c88f21e2db7f26d7a33ef099e2f6b87d2f', firstTradeAt: new Date(Date.now() - 45 * 60 * 1000), lifetimeTrades: 1 },
  
  // Older wallets with more history (some are sharks/whales)
  { _id: '0x11119e29a99723bfca850989f6655c65f2479e01', firstTradeAt: new Date(Date.now() - 30 * 24 * 3600 * 1000), lifetimeTrades: 28 },
  { _id: '0x222257d727b140fa789b6b7720977e2db7ff26b2', firstTradeAt: new Date(Date.now() - 15 * 24 * 3600 * 1000), lifetimeTrades: 12 },
  { _id: '0x333330fcf214b789b6b872d97a9f66ccf247ffbe', firstTradeAt: new Date(Date.now() - 40 * 24 * 3600 * 1000), lifetimeTrades: 45 },
  { _id: '0x4444f666f214b7e8d7a33ef0999e2f6b87f2ffcc', firstTradeAt: new Date(Date.now() - 60 * 24 * 3600 * 1000), lifetimeTrades: 110 },
  { _id: '0x555555c88f21e2db7f26d7a33ef099e2f6b87d2f', firstTradeAt: new Date(Date.now() - 5 * 24 * 3600 * 1000), lifetimeTrades: 4 },
  { _id: '0x666666e29a99723bfca850989f6655c65f2479e02', firstTradeAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), lifetimeTrades: 2 },
  { _id: '0x777777d727b140fa789b6b7720977e2db7ff26b3', firstTradeAt: new Date(Date.now() - 10 * 3600 * 1000), lifetimeTrades: 1 },
];

async function seed() {
  await dbConnect();
  console.log('Seeding database...');

  // 1. Clear existing database
  await Wallet.deleteMany({});
  await Market.deleteMany({});
  await Cluster.deleteMany({});
  await FlaggedBet.deleteMany({});
  await ClusterMember.deleteMany({});
  console.log('Cleared database.');

  // 2. Insert Markets
  await Market.insertMany(MARKETS_MOCK);
  console.log(`Seeded ${MARKETS_MOCK.length} markets.`);

  // 3. Insert Wallets
  await Wallet.insertMany(WALLETS_MOCK);
  console.log(`Seeded ${WALLETS_MOCK.length} wallets.`);

  // 4. Create coordinated Cluster
  // Target: Trump pardons crypto founder before Aug 1 (m-1)
  // Side: NO (odds of YES is 0.12, so odds of NO is 0.88? Wait, odds of NO is 0.88 which is high.
  // Wait, the cluster should be on a LOW odds outcome!
  // Oh, YES outcome odds is 0.12, which is low probability! Yes! So side should be YES for low-probability.
  // Let's set target side to YES (odds 0.12).
  const cluster = new Cluster({
    marketId: 'm-1',
    side: 'YES',
    oddsAtFlag: 0.12,
    aggregateSize: 520000,
    memberCount: 4,
    windowMinutes: 52,
    detectedAt: new Date(Date.now() - 30 * 60 * 1000),
  });
  await cluster.save();
  console.log('Seeded coordinated cluster.');

interface SeedBet {
  walletAddress: string;
  marketId: string;
  sizeUsd: number;
  odds: number;
  side: 'YES' | 'NO';
  result: 'OPEN' | 'WON' | 'LOST';
  pnl?: number;
  txHash: string;
  clusterId?: unknown;
  betAt: Date;
  isClusterMember: boolean;
  note?: string;
}

  // 5. Seed Flagged Bets & Cluster Members
  // We need 22 bets total
  const betsData: SeedBet[] = [
    // Cluster Bets (m-1, YES, odds 0.12)
    {
      walletAddress: '0x8f2d57d727b140fa789b6b7720977e2db7ff26b2',
      marketId: 'm-1',
      sizeUsd: 120000,
      odds: 0.12,
      side: 'YES',
      result: 'OPEN',
      txHash: '0xa1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: cluster._id,
      betAt: new Date(Date.now() - 75 * 60 * 1000), // 1h 15m ago
      isClusterMember: true,
      note: 'Wallet created 1 day ago. First trade is $120k on Trump pardon.'
    },
    {
      walletAddress: '0xa0c330fcf214b789b6b872d97a9f66ccf247ffbe',
      marketId: 'm-1',
      sizeUsd: 150000,
      odds: 0.12,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x22b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: cluster._id,
      betAt: new Date(Date.now() - 45 * 60 * 1000), // 45m ago
      isClusterMember: true,
      note: 'Wallet created 2 hours ago. First trade is $150k on Trump pardon.'
    },
    {
      walletAddress: '0xd7a9f666f214b7e8d7a33ef0999e2f6b87f2ffcc',
      marketId: 'm-1',
      sizeUsd: 100000,
      odds: 0.12,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x33b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: cluster._id,
      betAt: new Date(Date.now() - 35 * 60 * 1000), // 35m ago
      isClusterMember: true,
      note: 'Wallet created 1 hour ago. First trade is $100k on Trump pardon.'
    },
    {
      walletAddress: '0x992455c88f21e2db7f26d7a33ef099e2f6b87d2f',
      marketId: 'm-1',
      sizeUsd: 150000,
      odds: 0.12,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x44b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: cluster._id,
      betAt: new Date(Date.now() - 23 * 60 * 1000), // 23m ago
      isClusterMember: true,
      note: 'Wallet created 45 mins ago. First trade is $150k on Trump pardon.'
    },

    // Mega Whales
    {
      walletAddress: '0x3ef099e29a99723bfca850989f6655c65f2479e0',
      marketId: 'm-2',
      sizeUsd: 650000,
      odds: 0.18,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x55b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 2.5 * 3600 * 1000), // 2.5h ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x777777d727b140fa789b6b7720977e2db7ff26b3',
      marketId: 'm-5',
      sizeUsd: 580000,
      odds: 0.08,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x66b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 10 * 60 * 1000), // 10m ago
      isClusterMember: false,
    },

    // Whales
    {
      walletAddress: '0x11119e29a99723bfca850989f6655c65f2479e01',
      marketId: 'm-3',
      sizeUsd: 220000,
      odds: 0.24,
      side: 'YES',
      result: 'WON',
      pnl: 696667, // (220k / 0.24) - 220k
      txHash: '0x77b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 24 * 3600 * 1000), // 1 day ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x222257d727b140fa789b6b7720977e2db7ff26b2',
      marketId: 'm-4',
      sizeUsd: 180000,
      odds: 0.22,
      side: 'YES',
      result: 'LOST',
      pnl: -180000,
      txHash: '0x88b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 30 * 3600 * 1000), // 1.25 days ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x333330fcf214b789b6b872d97a9f66ccf247ffbe',
      marketId: 'm-6',
      sizeUsd: 310000,
      odds: 0.20,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x99b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 4 * 3600 * 1000), // 4h ago
      isClusterMember: false,
    },

    // Sharks
    {
      walletAddress: '0x555555c88f21e2db7f26d7a33ef099e2f6b87d2f',
      marketId: 'm-7',
      sizeUsd: 45000,
      odds: 0.15,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x00b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 15 * 60 * 1000), // 15m ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x666666e29a99723bfca850989f6655c65f2479e02',
      marketId: 'm-8',
      sizeUsd: 85000,
      odds: 0.04,
      side: 'YES',
      result: 'WON',
      pnl: 2040000, // (85k / 0.04) - 85k
      txHash: '0x11c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 3 * 24 * 3600 * 1000), // 3 days ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x666666e29a99723bfca850989f6655c65f2479e02',
      marketId: 'm-9',
      sizeUsd: 35000,
      odds: 0.02,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x22c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 5 * 3600 * 1000), // 5h ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x3ef099e29a99723bfca850989f6655c65f2479e0',
      marketId: 'm-10',
      sizeUsd: 55000,
      odds: 0.29,
      side: 'YES',
      result: 'OPEN',
      txHash: '0x33c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 8 * 3600 * 1000), // 8h ago
      isClusterMember: false,
    },
    {
      walletAddress: '0x3ef099e29a99723bfca850989f6655c65f2479e0',
      marketId: 'm-6',
      sizeUsd: 40000,
      odds: 0.22,
      side: 'YES',
      result: 'LOST',
      pnl: -40000,
      txHash: '0x44c2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
      clusterId: null,
      betAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 days ago
      isClusterMember: false,
    },
  ];

  // Let's add some more padding random bets (up to 22 total) to fill the screen
  const randomAddresses = [
    '0x11119e29a99723bfca850989f6655c65f2479e01',
    '0x222257d727b140fa789b6b7720977e2db7ff26b2',
    '0x333330fcf214b789b6b872d97a9f66ccf247ffbe',
    '0x4444f666f214b7e8d7a33ef0999e2f6b87f2ffcc',
    '0x555555c88f21e2db7f26d7a33ef099e2f6b87d2f',
  ];

  for (let i = betsData.length; i < 22; i++) {
    const wAddr = randomAddresses[i % randomAddresses.length];
    const mId = `m-${(i % 9) + 2}`; // m-2 to m-10
    const market = MARKETS_MOCK.find(m => m._id === mId);

    let side: 'YES' | 'NO' = 'YES';
    let odds = 0.12;

    if (market) {
      if (market.currentOddsYes !== null && market.currentOddsYes <= 0.30) {
        side = 'YES';
        odds = market.currentOddsYes + (Math.random() * 0.04 - 0.02);
      } else if (market.currentOddsNo !== null && market.currentOddsNo <= 0.30) {
        side = 'NO';
        odds = market.currentOddsNo + (Math.random() * 0.04 - 0.02);
      } else {
        side = (market.currentOddsYes || 0.5) < (market.currentOddsNo || 0.5) ? 'YES' : 'NO';
        odds = Math.min(market.currentOddsYes || 0.5, market.currentOddsNo || 0.5);
      }
    }

    odds = Math.max(0.01, Math.min(0.35, odds));
    const size = Math.floor(25000 + Math.random() * 200000);
    const result = Math.random() > 0.5 ? 'OPEN' : (Math.random() > 0.5 ? 'WON' : 'LOST');
    const pnl = result === 'OPEN' ? undefined : (result === 'WON' ? Math.round((size / odds) - size) : -size);

    betsData.push({
      walletAddress: wAddr,
      marketId: mId,
      sizeUsd: size,
      odds: parseFloat(odds.toFixed(2)),
      side,
      result: result as 'OPEN' | 'WON' | 'LOST',
      pnl,
      txHash: `0x${i}bc2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2`.substring(0, 66),
      clusterId: null,
      betAt: new Date(Date.now() - (i * 2 + 1) * 3600 * 1000), // sequential historical times
      isClusterMember: false,
    });
  }

  for (const bet of betsData) {
    // 1. Fetch wallet trades count for score calculation
    const wallet = WALLETS_MOCK.find(w => w._id === bet.walletAddress);
    const trades = wallet ? wallet.lifetimeTrades : 1;
    
    // 2. Classify tier
    const tier = classifyTier(bet.sizeUsd, bet.odds) || 'SHARK';
    
    // 3. Compute alert score
    const score = computeAlertScore(tier, bet.sizeUsd, bet.odds, trades);

    // 4. Save FlaggedBet
    const flaggedBet = new FlaggedBet({
      walletAddress: bet.walletAddress,
      marketId: bet.marketId,
      tier,
      sizeUsd: bet.sizeUsd,
      odds: bet.odds,
      side: bet.side,
      alertScore: score,
      result: bet.result,
      pnl: bet.pnl,
      txHash: bet.txHash,
      clusterId: bet.clusterId,
      betAt: bet.betAt,
    });
    
    const savedBet = await flaggedBet.save();

    // 5. If it's a cluster member, save to ClusterMembers too
    if (bet.isClusterMember) {
      const member = new ClusterMember({
        clusterId: cluster._id,
        walletAddress: bet.walletAddress,
        flaggedBetId: savedBet._id,
        sizeUsd: bet.sizeUsd,
        betAt: bet.betAt,
        note: bet.note,
      });
      await member.save();
    }
  }

  console.log(`Seeded ${betsData.length} flagged bets and cluster members.`);
  console.log('Database seeding completed successfully!');
  
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
