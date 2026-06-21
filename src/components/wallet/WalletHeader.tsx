'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ShieldAlert } from 'lucide-react';
import { formatShortDate } from '../../lib/formatting';

interface WalletHeaderProps {
  address: string;
  firstTradeAt: string | null;
  lifetimeTrades: number;
  inCluster: boolean;
  clusterId: string | null;
}

export const WalletHeader: React.FC<WalletHeaderProps> = ({
  address,
  firstTradeAt,
  lifetimeTrades,
  inCluster,
  clusterId,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3 mb-6 font-mono">
      {/* Navigation link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-ww-text-ghost hover:text-ww-text-primary transition-colors font-bold uppercase"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
      </Link>

      {/* Profile summary */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-md sm:text-lg md:text-xl font-bold text-ww-text-primary break-all">
            {address}
          </h1>
          <button
            onClick={handleCopy}
            className="text-ww-text-ghost hover:text-ww-text-primary p-1 bg-ww-bg-surface border border-ww-border rounded transition-all"
            title="Copy wallet address"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-ww-accent-green" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          {inCluster && clusterId && (
            <Link
              href={`/cluster/${clusterId}`}
              className="bg-ww-side-no/10 border border-ww-side-no/30 text-ww-side-no px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-ww-side-no/20 transition-all animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Coordinated Cluster Match
            </Link>
          )}
        </div>

        <div className="flex items-center gap-6 text-[10px] text-ww-text-dim mt-1">
          <div>
            <span className="text-ww-text-ghost uppercase font-bold tracking-widest mr-1.5">First Trade:</span>
            <span className="text-ww-text-muted">
              {firstTradeAt ? formatShortDate(firstTradeAt) : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-ww-text-ghost uppercase font-bold tracking-widest mr-1.5">Lifetime activity:</span>
            <span className="text-ww-text-muted font-bold">{lifetimeTrades} trades</span>
          </div>
        </div>
      </div>
    </div>
  );
};
