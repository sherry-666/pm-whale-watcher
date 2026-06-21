import { NextRequest } from 'next/server';
import { dbConnect } from '../../../lib/db';
import { Wallet, FlaggedBet, Market } from '../../../lib/models';
import { computeAlertScore } from '../../../lib/scoring';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      await dbConnect();

      // Helper to enqueue event packets in the correct format
      const sendEvent = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch (e) {
          console.error('Controller write failed, stream likely closed:', e);
        }
      };

      // Send greeting
      sendEvent('connected', { status: 'active', timestamp: new Date().toISOString() });

      // Run background generator to feed the dashboard in real-time (every 11s)
      const interval = setInterval(async () => {
        try {
          const markets = await Market.find({});
          if (markets.length === 0) return;

          const randomMarket = markets[Math.floor(Math.random() * markets.length)];

          // Generate random hash-looking address
          const hex = '0123456789abcdef';
          let address = '0x';
          for (let i = 0; i < 40; i++) {
            address += hex[Math.floor(Math.random() * 16)];
          }

          // Create new simulated wallet profile
          const wallet = new Wallet({
            _id: address,
            firstTradeAt: new Date(),
            lifetimeTrades: 1,
          });
          await wallet.save();

          // Define tier and size thresholds
          const rand = Math.random();
          let tier: 'SHARK' | 'WHALE' | 'MEGA_WHALE' = 'SHARK';
          let sizeUsd = 25000 + Math.random() * 70000;

          if (rand > 0.95) {
            tier = 'MEGA_WHALE';
            sizeUsd = 500000 + Math.random() * 400000;
          } else if (rand > 0.70) {
            tier = 'WHALE';
            sizeUsd = 100000 + Math.random() * 300000;
          }

          // Determine the actual low-odds side and probability from the market
          let side: 'YES' | 'NO' = 'YES';
          let odds = parseFloat((0.05 + Math.random() * 0.22).toFixed(2));

          const yesOdds = randomMarket.currentOddsYes;
          const noOdds = randomMarket.currentOddsNo;

          if (yesOdds !== null && yesOdds !== undefined && noOdds !== null && noOdds !== undefined) {
            // Find which side is the low-odds outcome (between 2% and 30%)
            if (yesOdds >= 0.02 && yesOdds <= 0.30) {
              side = 'YES';
              odds = parseFloat((yesOdds + (Math.random() * 0.04 - 0.02)).toFixed(3));
            } else if (noOdds >= 0.02 && noOdds <= 0.30) {
              side = 'NO';
              odds = parseFloat((noOdds + (Math.random() * 0.04 - 0.02)).toFixed(3));
            } else {
              side = yesOdds < noOdds ? 'YES' : 'NO';
              odds = Math.min(yesOdds, noOdds);
            }
          }

          // Clamp odds to a realistic range [0.01, 0.35]
          odds = Math.max(0.01, Math.min(0.35, odds));
          const score = computeAlertScore(tier, sizeUsd, odds, 1);

          // Generate simulated tx hash
          let txHash = '0x';
          for (let i = 0; i < 64; i++) {
            txHash += hex[Math.floor(Math.random() * 16)];
          }

          // Save FlaggedBet
          const flaggedBet = new FlaggedBet({
            walletAddress: address,
            marketId: randomMarket._id,
            tier,
            sizeUsd,
            odds,
            side,
            alertScore: score,
            result: 'OPEN',
            txHash,
            betAt: new Date(),
          });

          const savedBet = await flaggedBet.save();

          // Compile hydrated response payload
          const payload = {
            id: savedBet._id.toString(),
            walletAddress: address,
            marketId: randomMarket._id,
            tier,
            sizeUsd,
            odds,
            side,
            alertScore: score,
            result: 'OPEN',
            pnl: null,
            txHash,
            clusterId: null,
            betAt: flaggedBet.betAt.toISOString(),
            flaggedAt: flaggedBet.flaggedAt.toISOString(),
            createdAt: flaggedBet.createdAt.toISOString(),
            marketTitle: randomMarket.title,
            marketSlug: randomMarket.slug || '',
            marketEventSlug: randomMarket.eventSlug || '',
            marketCategory: randomMarket.category || 'General',
            marketNegRisk: !!randomMarket.negRisk,
            lifetimeTrades: 1,
          };

          sendEvent('new_bet', payload);
        } catch (err) {
          console.error('Error generating simulated event in SSE stream:', err);
        }
      }, 11000);

      // Clean up intervals on connection termination
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Stream already closed, ignore error
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
