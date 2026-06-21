import React from 'react';
import { BetSide } from '../../types';
import { SIDE_METADATA } from '../../lib/constants';

interface SideBadgeProps {
  side: BetSide;
}

export const SideBadge: React.FC<SideBadgeProps> = ({ side }) => {
  const meta = SIDE_METADATA[side] || SIDE_METADATA.YES;
  
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 border text-xs font-mono font-medium rounded ${meta.textColor} ${meta.borderColor} ${meta.bgColor}`}
    >
      {meta.label}
    </span>
  );
};
