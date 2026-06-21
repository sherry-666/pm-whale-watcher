'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { FlaggedBet } from '../../types';
import { shortenAddress, formatCurrency } from '../../lib/formatting';

export const TickerStrip: React.FC = () => {
  const { data } = useSWR('/api/feed');
  const bets: FlaggedBet[] = data?.bets || [];

  // Slice to the last 8 bets to keep the marquee clean and light
  const tickerBets = bets.slice(0, 8);

  if (tickerBets.length === 0) {
    return (
      <div className="w-full bg-ww-bg-bar border-b border-ww-border h-8 flex items-center justify-center text-[10px] text-ww-text-ghost uppercase tracking-wider font-mono">
        establishing live transmission feed...
      </div>
    );
  }

  const TickerItems = () => (
    <div className="flex items-center gap-12">
      {tickerBets.map((bet, idx) => (
        <React.Fragment key={`${bet.id}-${idx}`}>
          <Link
            href={`/wallet/${bet.walletAddress}`}
            className="flex items-center gap-2 hover:text-ww-accent-green transition-colors text-[11px] font-mono whitespace-nowrap"
          >
            <span className={bet.side === 'YES' ? 'text-ww-side-yes' : 'text-ww-side-no'}>
              {bet.side}
            </span>
            <span className="text-ww-text-muted">{shortenAddress(bet.walletAddress)}</span>
            <span className="text-ww-text-ghost">placed</span>
            <span className="text-ww-text-primary font-bold">{formatCurrency(bet.sizeUsd, true)}</span>
            <span className="text-ww-text-ghost">on</span>
            <span className="text-ww-text-secondary max-w-[200px] truncate">{bet.marketTitle || 'Market'}</span>
            <span className="text-ww-text-ghost">@ {Math.round(bet.odds * 100)}%</span>
          </Link>
          <span className="text-ww-text-ghost font-bold text-xs select-none">•</span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="w-full bg-ww-bg-bar border-b border-ww-border h-8 overflow-hidden relative flex items-center">
      {/* Edge gradient masks for smooth transition */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-ww-bg-app to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-ww-bg-app to-transparent z-10 pointer-events-none" />

      {/* Infinite scrolling marquee using CSS animations */}
      <div className="flex w-max select-none">
        <div className="flex gap-12 items-center animate-ww-tick whitespace-nowrap pr-12">
          <TickerItems />
        </div>
        <div className="flex gap-12 items-center animate-ww-tick whitespace-nowrap pr-12" aria-hidden="true">
          <TickerItems />
        </div>
      </div>
    </div>
  );
};
