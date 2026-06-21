/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/db';
import { Wallet, FlaggedBet, Market, ClusterMember } from '../../../../lib/models';
import { computeSuspicionScore } from '../../../../lib/scoring';
import { formatShortDate } from '../../../../lib/formatting';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    await dbConnect();
    const address = params.address.toLowerCase();

    // 1. Fetch wallet doc
    const wallet = await Wallet.findById(address);

    // If wallet doesn't exist in DB, return a default stub
    if (!wallet) {
      return NextResponse.json({
        address,
        firstTradeAt: null,
        lifetimeTrades: 0,
        bets: [],
        hitRate: 0,
        realizedPnl: 0,
        suspicionScore: 10,
        inCluster: false,
        clusterId: null,
        cumulativePnlSeries: [{ date: 'Start', pnl: 0 }],
      });
    }

    // 2. Fetch all flagged bets placed by this wallet
    const betsDocs = await FlaggedBet.find({ walletAddress: address })
      .sort({ betAt: -1 })
      .populate({ path: 'marketId', model: Market });

    const formattedBets = betsDocs.map((b: any) => ({
      id: b._id.toString(),
      walletAddress: b.walletAddress,
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
      lifetimeTrades: wallet.lifetimeTrades,
    }));

    // 3. Check cluster membership
    const memberDoc = await ClusterMember.findOne({ walletAddress: address });
    const inCluster = !!memberDoc;
    const clusterId = memberDoc ? memberDoc.clusterId.toString() : null;

    // 4. Calculate hit rate & realized PnL
    const resolvedBets = formattedBets.filter((b) => b.result !== 'OPEN');
    const totalResolved = resolvedBets.length;
    const wins = resolvedBets.filter((b) => b.result === 'WON').length;
    const hitRate = totalResolved > 0 ? Math.round((wins / totalResolved) * 100) : 0;
    const realizedPnl = formattedBets.reduce((sum, b) => sum + (b.pnl || 0), 0);

    // 5. Calculate overall suspicion score
    const suspicionScore = computeSuspicionScore(
      formattedBets,
      wallet.lifetimeTrades,
      inCluster
    );

    // 6. Build Cumulative P/L Chart Series
    // Sort resolved bets chronologically (oldest to newest)
    const resolvedBetsAsc = [...formattedBets]
      .filter((b) => b.result !== 'OPEN')
      .sort((a, b) => new Date(a.betAt).getTime() - new Date(b.betAt).getTime());

    let runningPnl = 0;
    const cumulativePnlSeries = [
      {
        date: wallet.firstTradeAt
          ? formatShortDate(wallet.firstTradeAt)
          : 'Start',
        pnl: 0,
      },
    ];

    for (const b of resolvedBetsAsc) {
      runningPnl += b.pnl || 0;
      cumulativePnlSeries.push({
        date: formatShortDate(b.betAt),
        pnl: runningPnl,
      });
    }

    return NextResponse.json({
      address: wallet._id,
      firstTradeAt: wallet.firstTradeAt ? wallet.firstTradeAt.toISOString() : null,
      lifetimeTrades: wallet.lifetimeTrades,
      bets: formattedBets,
      hitRate,
      realizedPnl,
      suspicionScore,
      inCluster,
      clusterId,
      cumulativePnlSeries,
    });
  } catch (error: any) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
