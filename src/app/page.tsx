'use client';

import React, { useState } from 'react';
import { useFeed } from '../hooks/useFeed';
import { useEventStream } from '../hooks/useEventStream';
import { MetricsRow } from '../components/feed/MetricsRow';
import { FilterBar } from '../components/feed/FilterBar';
import { FeedTable } from '../components/feed/FeedTable';

export default function FeedPage() {
  const [filter, setFilter] = useState<'all' | 'SHARK' | 'WHALE' | 'MEGA_WHALE'>('all');
  const [streamPaused, setStreamPaused] = useState(false);

  // Fetch feed data via SWR
  const { feed, isLoading } = useFeed();

  // Establish Server-Sent Events stream connection
  useEventStream(streamPaused);

  // Apply tier filters on the client-side
  const filteredBets = feed?.bets
    ? feed.bets.filter((bet) => {
        if (filter === 'all') return true;
        return bet.tier === filter;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Section 1: Dashboard Metrics */}
      <MetricsRow metrics={feed?.metrics} isLoading={isLoading} />

      {/* Section 2: Interactive Controls & Filters */}
      <FilterBar
        currentFilter={filter}
        setFilter={setFilter}
        streamPaused={streamPaused}
        setStreamPaused={setStreamPaused}
        tierCounts={feed?.tierCounts}
      />

      {/* Section 3: Telemetry Log Grid */}
      <FeedTable bets={filteredBets} isLoading={isLoading} />
    </div>
  );
}
