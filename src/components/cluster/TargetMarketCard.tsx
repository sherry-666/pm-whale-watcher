import React from 'react';
import { SideBadge } from '../shared/SideBadge';
import { formatOdds } from '../../lib/formatting';
import { BetSide } from '../../types';

interface TargetMarketCardProps {
  title: string;
  side: BetSide;
  oddsAtFlag: number;
}

export const TargetMarketCard: React.FC<TargetMarketCardProps> = ({
  title,
  side,
  oddsAtFlag,
}) => {
  return (
    <div className="bg-ww-bg-surface border border-ww-border p-6 rounded flex flex-col justify-between font-mono h-full">
      <div>
        <h3 className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest mb-3">
          TARGET SIGNAL OUTCOME
        </h3>
        <h2 className="text-sm md:text-base font-bold text-ww-text-primary leading-snug">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-ww-border-faint text-xs">
        <div>
          <div className="text-[9px] text-ww-text-ghost uppercase tracking-wider mb-1">
            TARGET SIDE
          </div>
          <SideBadge side={side} />
        </div>
        <div>
          <div className="text-[9px] text-ww-text-ghost uppercase tracking-wider mb-1">
            ODDS AT DETECTION
          </div>
          <span className="text-sm font-bold text-ww-text-primary">
            {formatOdds(oddsAtFlag)}
          </span>
        </div>
      </div>

      <div className="mt-4 text-[10px] text-ww-text-muted leading-relaxed">
        <strong>Risk analysis:</strong> Multiple freshly created proxy wallets entering the same low-probability market within a short window indicates a high probability of asymmetric information (insider trading) or coordinated syndicate manipulation.
      </div>
    </div>
  );
};
