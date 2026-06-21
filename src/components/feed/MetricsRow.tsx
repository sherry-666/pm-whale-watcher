import React from 'react';
import { FeedMetrics } from '../../types';
import { formatCurrency } from '../../lib/formatting';

interface MetricsRowProps {
  metrics: FeedMetrics | undefined;
  isLoading: boolean;
}

export const MetricsRow: React.FC<MetricsRowProps> = ({ metrics, isLoading }) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-ww-bg-surface border border-ww-border p-4 rounded h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 24h Volume */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px]">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-wider">
          24h Flagged Volume
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-text-primary">
            {formatCurrency(metrics.volume24h, true)}
          </span>
          <span className="text-[10px] font-bold text-ww-accent-green">
            {metrics.volumeDelta}
          </span>
        </div>
      </div>

      {/* New Wallets */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px]">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-wider">
          Emerging Wallets (24h)
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-text-primary">
            {metrics.newWalletsToday}
          </span>
          <span className="text-[10px] text-ww-text-muted">
            wallets flagged
          </span>
        </div>
      </div>

      {/* Hottest Market */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px]">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-wider">
          Hottest Signal Target
        </span>
        <div className="mt-1 truncate">
          {metrics.hottestMarket ? (
            <>
              <div className="text-[11px] text-ww-text-primary font-bold truncate max-w-full">
                {metrics.hottestMarket.title}
              </div>
              <div className="text-[9px] text-ww-text-muted mt-0.5">
                {metrics.hottestMarket.betCount} coordinated trades
              </div>
            </>
          ) : (
            <div className="text-xs text-ww-text-muted">No activity</div>
          )}
        </div>
      </div>

      {/* Biggest Bet */}
      <div className="bg-ww-bg-surface border border-ww-border p-4 rounded flex flex-col justify-between min-h-[86px]">
        <span className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-wider">
          Max Bet Size Flagged
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-xl font-bold text-ww-accent-green">
            {formatCurrency(metrics.biggestBetAllTime, true)}
          </span>
          <span className="text-[10px] text-ww-text-muted">
            single trade
          </span>
        </div>
      </div>
    </div>
  );
};
