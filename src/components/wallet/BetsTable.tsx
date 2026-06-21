'use client';

import React from 'react';
import { WalletBet } from '../../types';
import { SideBadge } from '../shared/SideBadge';
import { ScoreBar } from '../shared/ScoreBar';
import { formatCurrency, formatOdds, shortenAddress } from '../../lib/formatting';

interface BetsTableProps {
  bets: WalletBet[];
}

export const BetsTable: React.FC<BetsTableProps> = ({ bets }) => {
  if (bets.length === 0) {
    return (
      <div className="w-full bg-ww-bg-surface border border-ww-border rounded overflow-hidden p-8 text-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest">
        no transaction history logged for this wallet
      </div>
    );
  }

  return (
    <div className="w-full bg-ww-bg-surface border border-ww-border rounded overflow-hidden overflow-x-auto">
      <table className="w-full border-collapse text-left min-w-[900px]">
        <thead>
          <tr className="bg-ww-bg-header-row border-b border-ww-border text-[9px] font-bold text-ww-text-ghost uppercase tracking-widest font-mono font-bold">
            <th className="px-4 py-2.5">Score</th>
            <th className="px-4 py-2.5">Target Market</th>
            <th className="px-4 py-2.5">Side</th>
            <th className="px-4 py-2.5">Bet Size</th>
            <th className="px-4 py-2.5">Odds</th>
            <th className="px-4 py-2.5">Max Payout</th>
            <th className="px-4 py-2.5">PnL</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5 text-right">Transaction</th>
          </tr>
        </thead>
        <tbody>
          {bets.map((bet) => {
            const payout = bet.sizeUsd / bet.odds;
            const pnl = bet.pnl;
            const isWon = bet.result === 'WON';
            const isLost = bet.result === 'LOST';

            return (
              <tr
                key={bet.id}
                className="border-b border-ww-border-faint hover:bg-ww-bg-surface/50 transition-colors font-mono text-xs"
              >
                {/* 1. Alert Score */}
                <td className="px-4 py-3">
                  <ScoreBar score={bet.alertScore} />
                </td>

                {/* 2. Target Market */}
                <td className="px-4 py-3 max-w-[280px] truncate text-ww-text-secondary">
                  {bet.marketTitle}
                </td>

                {/* 3. Side */}
                <td className="px-4 py-3">
                  <SideBadge side={bet.side} />
                </td>

                {/* 4. Bet Size */}
                <td className="px-4 py-3 text-ww-text-primary font-bold">
                  {formatCurrency(bet.sizeUsd)}
                </td>

                {/* 5. Odds */}
                <td className="px-4 py-3 text-ww-text-muted font-bold">
                  {formatOdds(bet.odds)}
                </td>

                {/* 6. Max Payout */}
                <td className="px-4 py-3 text-ww-text-dim">
                  {formatCurrency(payout)}
                </td>

                {/* 7. PnL */}
                <td
                  className={`px-4 py-3 font-bold ${
                    isWon
                      ? 'text-ww-accent-green'
                      : isLost
                      ? 'text-ww-side-no'
                      : 'text-ww-text-ghost'
                  }`}
                >
                  {pnl !== null
                    ? `${pnl >= 0 ? '+' : ''}${formatCurrency(pnl)}`
                    : '--'}
                </td>

                {/* 8. Status */}
                <td className="px-4 py-3">
                  <span
                    className={`px-1.5 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider ${
                      isWon
                        ? 'text-ww-accent-green border-ww-accent-green/20 bg-ww-accent-green/5'
                        : isLost
                        ? 'text-ww-side-no border-ww-side-no/20 bg-ww-side-no/5'
                        : 'text-ww-text-muted border-ww-border bg-ww-bg-input'
                    }`}
                  >
                    {bet.result}
                  </span>
                </td>

                {/* 9. Tx Hash */}
                <td className="px-4 py-3 text-right">
                  {bet.txHash ? (
                    <span className="text-[10px] text-ww-text-ghost font-bold font-mono">
                      {shortenAddress(bet.txHash, 6)}
                    </span>
                  ) : (
                    <span className="text-ww-text-ghost">--</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
