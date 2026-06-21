import React from 'react';
import { formatCurrency, formatOdds } from '../../lib/formatting';

interface ClusterMetricsProps {
  memberCount: number;
  aggregateSize: number;
  windowMinutes: number;
  oddsAtFlag: number;
}

export const ClusterMetrics: React.FC<ClusterMetricsProps> = ({
  memberCount,
  aggregateSize,
  windowMinutes,
  oddsAtFlag,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 1. Wallet Count */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px] font-mono">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest">
          COORDINATED WALLETS
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-side-no">
            {memberCount}
          </span>
          <span className="text-[10px] text-ww-text-muted">
            fresh safe wallets
          </span>
        </div>
      </div>

      {/* 2. Combined capital size */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px] font-mono">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest">
          AGGREGATE CAPITAL
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-text-primary">
            {formatCurrency(aggregateSize)}
          </span>
        </div>
      </div>

      {/* 3. Time Window */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px] font-mono">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest">
          TIME WINDOW
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-text-primary">
            {windowMinutes}m
          </span>
          <span className="text-[10px] text-ww-text-muted font-bold">
            rapid entry
          </span>
        </div>
      </div>

      {/* 4. Entry odds */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px] font-mono">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest">
          ENTRY ODDS AT FLAG
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-text-primary">
            {formatOdds(oddsAtFlag)}
          </span>
          <span className="text-[10px] text-ww-text-muted font-bold">
            low-prob target
          </span>
        </div>
      </div>
    </div>
  );
};
