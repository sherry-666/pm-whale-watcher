'use client';

import React from 'react';
import { Play, Pause } from 'lucide-react';

interface FilterBarProps {
  currentFilter: 'all' | 'SHARK' | 'WHALE' | 'MEGA_WHALE';
  setFilter: (filter: 'all' | 'SHARK' | 'WHALE' | 'MEGA_WHALE') => void;
  streamPaused: boolean;
  setStreamPaused: (paused: boolean) => void;
  tierCounts: {
    all: number;
    SHARK: number;
    WHALE: number;
    MEGA_WHALE: number;
  } | undefined;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentFilter,
  setFilter,
  streamPaused,
  setStreamPaused,
  tierCounts,
}) => {
  const counts = tierCounts || { all: 0, SHARK: 0, WHALE: 0, MEGA_WHALE: 0 };

  const filterOptions: { label: string; value: typeof currentFilter; count: number; colorClass: string }[] = [
    { label: 'ALL ALERTS', value: 'all', count: counts.all, colorClass: 'border-ww-border text-ww-text-muted hover:border-ww-text-muted hover:text-ww-text-primary' },
    { label: 'SHARKS', value: 'SHARK', count: counts.SHARK, colorClass: 'border-ww-tier-shark/30 hover:border-ww-tier-shark text-ww-tier-shark' },
    { label: 'WHALES', value: 'WHALE', count: counts.WHALE, colorClass: 'border-ww-tier-whale/30 hover:border-ww-tier-whale text-ww-tier-whale' },
    { label: 'MEGA WHALES', value: 'MEGA_WHALE', count: counts.MEGA_WHALE, colorClass: 'border-ww-tier-mega/30 hover:border-ww-tier-mega text-ww-tier-mega' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 select-none">
      {/* Left: Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const isActive = currentFilter === opt.value;

          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex items-center gap-2 border px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                isActive
                  ? 'bg-ww-accent-green/5 border-ww-accent-green text-ww-accent-green'
                  : `bg-transparent ${opt.colorClass}`
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded-sm ${
                  isActive ? 'bg-ww-accent-green text-ww-bg-app' : 'bg-ww-bg-input text-ww-text-dim border border-ww-border'
                }`}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Live Stream Toggle */}
      <button
        onClick={() => setStreamPaused(!streamPaused)}
        className={`flex items-center gap-2 border px-3 py-1 rounded text-[11px] font-mono font-bold transition-all leading-none ${
          streamPaused
            ? 'border-ww-text-muted/40 text-ww-text-muted hover:border-ww-text-muted'
            : 'border-ww-accent-green/30 text-ww-accent-green hover:border-ww-accent-green'
        }`}
      >
        {streamPaused ? (
          <>
            <Play className="w-3 h-3 fill-current" />
            <span>RESUME STREAM</span>
          </>
        ) : (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ww-accent-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ww-accent-green"></span>
            </span>
            <Pause className="w-3.5 h-3.5" />
            <span>PAUSE STREAM</span>
          </>
        )}
      </button>
    </div>
  );
};
