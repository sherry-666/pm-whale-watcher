'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useCluster } from '../../../hooks/useCluster';
import { ClusterMetrics } from '../../../components/cluster/ClusterMetrics';
import { TargetMarketCard } from '../../../components/cluster/TargetMarketCard';
import { CoordinationTimeline } from '../../../components/cluster/CoordinationTimeline';

interface ClusterPageProps {
  params: { id: string };
}

export default function ClusterPage({ params }: ClusterPageProps) {
  const { id } = params;
  const { cluster, isLoading } = useCluster(id);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest animate-pulse">
        synchronizing coordinated cluster telemetry...
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest">
        coordinated cluster node not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="space-y-3 font-mono">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-ww-text-ghost hover:text-ww-text-primary transition-colors font-bold uppercase"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Feed
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-md sm:text-lg md:text-xl font-bold text-ww-text-primary flex items-center gap-2">
            <span>🚨</span> CLUSTER DETECTED
          </h1>
          <span className="bg-ww-side-no/10 border border-ww-side-no/30 text-ww-side-no px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest animate-pulse">
            HIGH SEVERITY ALERT
          </span>
        </div>
      </div>

      {/* Cluster Metrics Row */}
      <ClusterMetrics
        memberCount={cluster.memberCount}
        aggregateSize={cluster.aggregateSize}
        windowMinutes={cluster.windowMinutes}
        oddsAtFlag={cluster.oddsAtFlag}
      />

      {/* Target Market and Chronology Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <TargetMarketCard
            title={cluster.market.title}
            side={cluster.side}
            oddsAtFlag={cluster.oddsAtFlag}
            marketSlug={cluster.market.slug}
          />
        </div>
        <div className="md:col-span-2">
          <CoordinationTimeline members={cluster.members} />
        </div>
      </div>
    </div>
  );
}
