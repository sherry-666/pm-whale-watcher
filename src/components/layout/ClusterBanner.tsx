'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { Cluster } from '../../types';

export const ClusterBanner: React.FC = () => {
  const { data } = useSWR('/api/feed');
  const activeCluster: Cluster | null = data?.activeCluster || null;
  const [dismissed, setDismissed] = useState(true); // Default to true to prevent flash before mount

  useEffect(() => {
    // Only check sessionStorage on the client side
    const isDismissed = sessionStorage.getItem('ww-cluster-dismissed');
    setDismissed(isDismissed === 'true');
  }, [activeCluster]);

  const handleDismiss = () => {
    sessionStorage.setItem('ww-cluster-dismissed', 'true');
    setDismissed(true);
  };

  if (!activeCluster || dismissed) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-950 via-ww-cluster-red/80 to-red-950 border-b border-ww-cluster-red/30 animate-pulse text-ww-text-primary px-4 py-2 flex items-center justify-between gap-4 select-none">
      {/* Alert Content */}
      <div className="flex items-center gap-2.5 max-w-[80%]">
        <AlertTriangle className="w-4 h-4 text-ww-text-primary shrink-0 animate-ww-blink" />
        <span className="text-xs font-mono font-bold tracking-tight">
          COORDINATED ACTIVITY DETECTED: {activeCluster.memberCount} fresh wallets buying {activeCluster.side} on &quot;{activeCluster.marketTitle || 'Market'}&quot; within {activeCluster.windowMinutes}m.
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href={`/cluster/${activeCluster.id}`}
          className="bg-ww-text-primary text-red-950 hover:bg-ww-text-secondary font-mono font-bold text-[10px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 uppercase"
        >
          Investigate <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          onClick={handleDismiss}
          className="text-ww-text-primary/70 hover:text-ww-text-primary p-0.5"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
