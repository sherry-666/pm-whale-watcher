import React from 'react';

interface ScoreBarProps {
  score: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ score }) => {
  let fillColor = 'bg-ww-accent-green';
  let textColor = 'text-ww-accent-green';

  if (score >= 80) {
    fillColor = 'bg-ww-side-no';
    textColor = 'text-ww-side-no';
  } else if (score >= 60) {
    fillColor = 'bg-ww-tier-whale';
    textColor = 'text-ww-tier-whale';
  } else if (score >= 40) {
    fillColor = 'bg-ww-tier-shark';
    textColor = 'text-ww-tier-shark';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-ww-bg-input border border-ww-border-subtle rounded-sm overflow-hidden">
        <div
          className={`h-full ${fillColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-mono font-bold ${textColor} min-w-[16px] text-right`}>
        {score}
      </span>
    </div>
  );
};
