import React from 'react';
import { BetTier } from '../../types';
import { TIER_METADATA } from '../../lib/constants';

interface TierBadgeProps {
  tier: BetTier;
}

export const TierBadge: React.FC<TierBadgeProps> = ({ tier }) => {
  const meta = TIER_METADATA[tier];
  if (!meta) return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 border text-xs font-mono font-medium rounded ${meta.textColor} ${meta.borderColor} ${meta.bgColor}`}
    >
      {meta.label.replace('_', ' ')}
    </span>
  );
};
