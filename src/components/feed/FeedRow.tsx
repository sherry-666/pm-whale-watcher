'use client';

import React from 'react';
import Link from 'next/link';
import { FlaggedBet } from '../../types';
import { SideBadge } from '../shared/SideBadge';
import { ScoreBar } from '../shared/ScoreBar';
import { TimeAgo } from '../shared/TimeAgo';
import { shortenAddress, formatCurrency, formatOdds } from '../../lib/formatting';

interface FeedRowProps {
  bet: FlaggedBet;
}

export const FeedRow: React.FC<FeedRowProps> = ({ bet }) => {
  // Apply our custom keyframe flash if this bet was injected live
  const animClass = bet.isNew ? 'animate-ww-in' : '';

  return (
    <tr
      className={`border-b border-ww-border-faint hover:bg-ww-bg-surface/50 transition-colors font-mono text-xs ${animClass}`}
    >
      {/* 1. Alert Score */}
      <td className="px-4 py-3">
        <ScoreBar score={bet.alertScore} />
      </td>

      {/* 2. Wallet Address */}
      <td className="px-4 py-3">
        <Link
          href={`/wallet/${bet.walletAddress}`}
          className="text-ww-text-primary hover:text-ww-accent-green font-bold transition-colors"
        >
          {shortenAddress(bet.walletAddress)}
        </Link>
        {bet.clusterId && (
          <span className="ml-2 text-[9px] text-ww-side-no border border-ww-side-no/20 bg-ww-side-no/5 px-1 py-0.5 rounded-sm uppercase tracking-widest font-bold">
            Coordinated
          </span>
        )}
      </td>

      {/* 3. Wallet Experience */}
      <td className="px-4 py-3 text-ww-text-dim">
        {bet.lifetimeTrades !== undefined ? `${bet.lifetimeTrades} txs` : '--'}
      </td>

      {/* 4. Target Market */}
      <td className="px-4 py-3 max-w-[280px] truncate text-ww-text-secondary font-medium">
        {bet.marketSlug ? (
          <a
            href={`https://polymarket.com/event/${bet.marketSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ww-text-primary hover:underline transition-colors flex items-center gap-1 inline-flex max-w-full"
            title={bet.marketTitle || 'View on Polymarket'}
          >
            <span className="truncate">{bet.marketTitle || 'Unknown Market'}</span>
            <span className="text-[10px] text-ww-text-ghost font-bold">↗</span>
          </a>
        ) : (
          bet.marketTitle || 'Unknown Market'
        )}
      </td>

      {/* 5. Outcome Side */}
      <td className="px-4 py-3">
        <SideBadge side={bet.side} />
      </td>

      {/* 6. Bet Size (USD) */}
      <td className="px-4 py-3 text-ww-text-primary font-bold">
        {formatCurrency(bet.sizeUsd)}
      </td>

      {/* 7. Odds */}
      <td className="px-4 py-3 text-ww-text-muted font-bold">
        {formatOdds(bet.odds)}
      </td>

      {/* 8. Time */}
      <td className="px-4 py-3 text-right">
        <TimeAgo timestamp={bet.betAt} />
      </td>
    </tr>
  );
};
