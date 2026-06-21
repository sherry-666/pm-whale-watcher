/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { dbConnect } from '../../../lib/db';
import { FlaggedBet, Cluster, Wallet, Market } from '../../../lib/models';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    // 1. Fetch recent flagged bets (limit 100)
    const betsDocs = await FlaggedBet.find()
      .sort({ betAt: -1 })
      .populate({ path: 'marketId', model: Market })
      .populate({ path: 'walletAddress', model: Wallet })
      .limit(100);

    const formattedBets = betsDocs.map((b: any) => ({
      id: b._id.toString(),
      walletAddress: b.walletAddress ? b.walletAddress._id : 'unknown',
      marketId: b.marketId ? b.marketId._id : 'unknown',
      tier: b.tier,
      sizeUsd: b.sizeUsd,
      odds: b.odds,
      side: b.side,
      alertScore: b.alertScore,
      result: b.result,
      pnl: b.pnl,
      txHash: b.txHash,
      clusterId: b.clusterId ? b.clusterId.toString() : null,
      betAt: b.betAt.toISOString(),
      flaggedAt: b.flaggedAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
      marketTitle: b.marketId ? b.marketId.title : 'Unknown Market',
      lifetimeTrades: b.walletAddress ? b.walletAddress.lifetimeTrades : 1,
    }));

    // 2. Compute 24h Metrics
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const dayBeforeYesterday = new Date(Date.now() - 48 * 3600 * 1000);

    // 24h volume
    const vol24hResult = await FlaggedBet.aggregate([
      { $match: { betAt: { $gte: yesterday } } },
      { $group: { _id: null, total: { $sum: '$sizeUsd' } } },
    ]);
    const volume24h = vol24hResult[0]?.total || 0;

    // Previous 24h volume (for delta)
    const prevVol24hResult = await FlaggedBet.aggregate([
      { $match: { betAt: { $gte: dayBeforeYesterday, $lt: yesterday } } },
      { $group: { _id: null, total: { $sum: '$sizeUsd' } } },
    ]);
    const prevVolume = prevVol24hResult[0]?.total || 0;
    
    let volumeDelta = '+0.0%';
    if (prevVolume > 0) {
      const diff = ((volume24h - prevVolume) / prevVolume) * 100;
      volumeDelta = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    } else if (volume24h > 0) {
      volumeDelta = '+100.0%';
    }

    // New wallets today
    const newWalletsToday = await Wallet.countDocuments({
      firstTradeAt: { $gte: yesterday },
    });

    // Hottest market
    const hottestResult = await FlaggedBet.aggregate([
      { $match: { betAt: { $gte: yesterday } } },
      { $group: { _id: '$marketId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    
    let hottestMarket = null;
    if (hottestResult.length > 0) {
      const m = await Market.findById(hottestResult[0]._id);
      if (m) {
        hottestMarket = { title: m.title, betCount: hottestResult[0].count };
      }
    }

    // Biggest bet all time
    const biggestResult = await FlaggedBet.find().sort({ sizeUsd: -1 }).limit(1);
    const biggestBetAllTime = biggestResult[0]?.sizeUsd || 0;

    const metrics = {
      volume24h,
      volumeDelta,
      newWalletsToday,
      hottestMarket,
      biggestBetAllTime,
    };

    // 3. Fetch active coordination cluster (most recent)
    const clusterDoc: any = await Cluster.findOne()
      .sort({ detectedAt: -1 })
      .populate({ path: 'marketId', model: Market });
    
    let activeCluster = null;
    if (clusterDoc) {
      activeCluster = {
        id: clusterDoc._id.toString(),
        marketId: clusterDoc.marketId ? clusterDoc.marketId._id : 'unknown',
        side: clusterDoc.side,
        oddsAtFlag: clusterDoc.oddsAtFlag,
        aggregateSize: clusterDoc.aggregateSize,
        memberCount: clusterDoc.memberCount,
        windowMinutes: clusterDoc.windowMinutes,
        detectedAt: clusterDoc.detectedAt.toISOString(),
        createdAt: clusterDoc.createdAt.toISOString(),
        marketTitle: clusterDoc.marketId ? clusterDoc.marketId.title : 'Unknown Market',
      };
    }

    // 4. Fetch Tier Counts
    const all = await FlaggedBet.countDocuments({});
    const SHARK = await FlaggedBet.countDocuments({ tier: 'SHARK' });
    const WHALE = await FlaggedBet.countDocuments({ tier: 'WHALE' });
    const MEGA_WHALE = await FlaggedBet.countDocuments({ tier: 'MEGA_WHALE' });

    const tierCounts = {
      all,
      SHARK,
      WHALE,
      MEGA_WHALE,
    };

    return NextResponse.json({
      bets: formattedBets,
      metrics,
      activeCluster,
      tierCounts,
    });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
