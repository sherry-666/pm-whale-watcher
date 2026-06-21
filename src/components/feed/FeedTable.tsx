'use client';

import React from 'react';
import { FlaggedBet } from '../../types';
import { FeedRow } from './FeedRow';

interface FeedTableProps {
  bets: FlaggedBet[];
  isLoading: boolean;
}

export const FeedTable: React.FC<FeedTableProps> = ({ bets, isLoading }) => {
  if (isLoading) {
    return (
      <div className="w-full bg-ww-bg-surface border border-ww-border rounded overflow-hidden">
        <div className="h-64 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest animate-pulse">
          synchronizing telemetry database stream...
        </div>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="w-full bg-ww-bg-surface border border-ww-border rounded overflow-hidden">
        <div className="h-64 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest">
          no anomalies logged matching current telemetry filter
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-ww-bg-surface border border-ww-border rounded overflow-hidden overflow-x-auto">
      <table className="w-full border-collapse text-left min-w-[800px]">
        <thead>
          <tr className="bg-ww-bg-header-row border-b border-ww-border text-[9px] font-bold text-ww-text-ghost uppercase tracking-widest font-mono">
            <th className="px-4 py-2.5">Alert Score</th>
            <th className="px-4 py-2.5">Wallet Address</th>
            <th className="px-4 py-2.5">Wallet Experience</th>
            <th className="px-4 py-2.5">Target Market</th>
            <th className="px-4 py-2.5">Outcome</th>
            <th className="px-4 py-2.5">Bet Size (USD)</th>
            <th className="px-4 py-2.5">Price/Odds</th>
            <th className="px-4 py-2.5 text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => (
            <FeedRow key={bet.id} bet={bet} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
