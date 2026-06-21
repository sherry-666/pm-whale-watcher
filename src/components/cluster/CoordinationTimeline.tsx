'use client';

import React from 'react';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { formatCurrency, formatShortDate, shortenAddress } from '../../lib/formatting';

interface TimelineMember {
  walletAddress: string;
  size: number;
  betAt: string;
  note: string | null;
}

interface CoordinationTimelineProps {
  members: TimelineMember[];
}

export const CoordinationTimeline: React.FC<CoordinationTimelineProps> = ({ members }) => {
  if (members.length === 0) return null;

  // Ensure members are sorted ascending by date
  const sortedMembers = [...members].sort(
    (a, b) => new Date(a.betAt).getTime() - new Date(b.betAt).getTime()
  );

  const baseTime = new Date(sortedMembers[0].betAt).getTime();

  return (
    <div className="bg-ww-bg-surface border border-ww-border p-6 rounded font-mono">
      <h3 className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest mb-6 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> COORDINATION CHRONOLOGY
      </h3>

      <div className="relative pl-6 border-l border-ww-border-subtle space-y-6">
        {sortedMembers.map((member, idx) => {
          const currentTime = new Date(member.betAt).getTime();
          const diffMs = currentTime - baseTime;
          const diffMin = Math.floor(diffMs / 60000);
          const diffSec = Math.floor((diffMs % 60000) / 1000);

          const timeOffset =
            idx === 0
              ? 'T+00:00 (initial trigger)'
              : `T+${String(diffMin).padStart(2, '0')}:${String(diffSec).padStart(2, '0')}`;

          return (
            <div key={member.walletAddress} className="relative">
              {/* Timeline Indicator Dot */}
              <div
                className={`absolute -left-[29px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-ww-bg-surface ${
                  idx === 0
                    ? 'bg-ww-accent-green animate-pulse'
                    : 'bg-ww-side-no'
                }`}
              />

              {/* Entry Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-bold text-ww-text-ghost">
                    {timeOffset}
                  </span>
                  <Link
                    href={`/wallet/${member.walletAddress}`}
                    className="text-xs font-bold text-ww-text-primary hover:text-ww-accent-green transition-colors"
                  >
                    {shortenAddress(member.walletAddress)}
                  </Link>
                  <span className="text-xs font-bold text-ww-accent-green">
                    {formatCurrency(member.size, true)}
                  </span>
                  <span className="text-[10px] text-ww-text-dim">
                    {formatShortDate(member.betAt)}
                  </span>
                </div>

                {member.note && (
                  <p className="text-[10px] text-ww-text-muted leading-relaxed max-w-2xl bg-ww-bg-input/40 px-2.5 py-1.5 rounded border border-ww-border-faint mt-1">
                    {member.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
