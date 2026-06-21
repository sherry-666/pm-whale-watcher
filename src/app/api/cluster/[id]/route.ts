/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '../../../../lib/db';
import { Cluster, Market, ClusterMember } from '../../../../lib/models';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id } = params;

    // 1. Fetch cluster
    const cluster: any = await Cluster.findById(id).populate({
      path: 'marketId',
      model: Market,
    });

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // 2. Fetch cluster members
    const membersDocs = await ClusterMember.find({ clusterId: id }).sort({
      betAt: 1,
    });

    const formattedMembers = membersDocs.map((m: any) => ({
      walletAddress: m.walletAddress,
      size: m.sizeUsd,
      betAt: m.betAt.toISOString(),
      note: m.note || null,
    }));

    return NextResponse.json({
      id: cluster._id.toString(),
      market: {
        id: cluster.marketId ? cluster.marketId._id : 'unknown',
        title: cluster.marketId ? cluster.marketId.title : 'Unknown Market',
        slug: cluster.marketId ? cluster.marketId.slug : null,
        eventSlug: cluster.marketId ? cluster.marketId.eventSlug : null,
        category: cluster.marketId ? cluster.marketId.category : 'General',
        negRisk: cluster.marketId ? !!cluster.marketId.negRisk : false,
      },
      side: cluster.side,
      oddsAtFlag: cluster.oddsAtFlag,
      aggregateSize: cluster.aggregateSize,
      memberCount: cluster.memberCount,
      windowMinutes: cluster.windowMinutes,
      detectedAt: cluster.detectedAt.toISOString(),
      members: formattedMembers,
    });
  } catch (error: any) {
    console.error('Error fetching cluster:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
