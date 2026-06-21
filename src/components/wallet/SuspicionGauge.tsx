import React from 'react';

interface SuspicionGaugeProps {
  score: number;
}

export const SuspicionGauge: React.FC<SuspicionGaugeProps> = ({ score }) => {
  // Determine color and status labels based on score thresholds
  let color = '#00e5a0'; // green
  let statusText = 'LOW SUSPICION';
  let descText = 'Trade volumes and odds match typical retail profile.';

  if (score >= 80) {
    color = '#ff4d4d'; // red
    statusText = 'CRITICAL';
    descText = 'Coordinated trading matches insider profile: fresh wallet & huge bets.';
  } else if (score >= 60) {
    color = '#ff8f3f'; // orange
    statusText = 'HIGH';
    descText = 'Large positions on low-probability outcomes with minimal history.';
  } else if (score >= 40) {
    color = '#f5b942'; // yellow
    statusText = 'ELEVATED';
    descText = 'Abnormally large bet sizes relative to wallet age.';
  }

  // Map 0-100 score to 180 (left) - 0 (right) degrees for the SVG needle
  const angle = 180 - (score / 100) * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const r = 62;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  return (
    <div className="bg-ww-bg-surface border border-ww-border p-6 rounded flex flex-col items-center justify-center text-center font-mono h-full">
      <h3 className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest mb-3">
        SUSPICION INDEX
      </h3>

      <div className="relative w-48 h-24 overflow-hidden">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* Track background */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#121925"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Active Highlight Arc */}
          <path
            d={`M 20 100 A 80 80 0 0 1 ${100 + 80 * Math.cos(Math.PI - rad)} ${100 - 80 * Math.sin(Math.PI - rad)}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Tick delimiters */}
          <line x1="20" y1="100" x2="30" y2="100" stroke="#06080c" strokeWidth="2" />
          <line x1="100" y1="20" x2="100" y2="30" stroke="#06080c" strokeWidth="2" />
          <line x1="170" y1="100" x2="180" y2="100" stroke="#06080c" strokeWidth="2" />

          {/* Center node */}
          <circle cx="100" cy="100" r="5" fill={color} />

          {/* Indicator Needle */}
          <line
            x1="100"
            y1="100"
            x2={nx}
            y2={ny}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>

        {/* Float Value display */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-2xl font-bold tracking-tight text-ww-text-primary leading-none">
            {score}
          </span>
          <span className="text-[9px] font-bold mt-1 tracking-widest" style={{ color }}>
            {statusText}
          </span>
        </div>
      </div>

      <p className="text-[10px] text-ww-text-muted mt-3 max-w-[210px] leading-relaxed">
        {descText}
      </p>
    </div>
  );
};
