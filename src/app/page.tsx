'use client';

import React, { useState } from 'react';
import { useFeed } from '../hooks/useFeed';
import { useEventStream } from '../hooks/useEventStream';
import { MetricsRow } from '../components/feed/MetricsRow';
import { FilterBar } from '../components/feed/FilterBar';
import { FeedTable } from '../components/feed/FeedTable';

export default function FeedPage() {
  const [filter, setFilter] = useState<'all' | 'SHARK' | 'WHALE' | 'MEGA_WHALE'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [streamPaused, setStreamPaused] = useState(false);

  // Fetch feed data via SWR
  const { feed, isLoading } = useFeed();

  // Establish Server-Sent Events stream connection
  useEventStream(streamPaused);

  // Extract unique active categories from the feed data
  const availableCategories = feed?.bets
    ? Array.from(
        new Set(feed.bets.map((b) => b.marketCategory).filter(Boolean) as string[])
      ).sort()
    : [];

  // Apply tier and category filters on the client-side
  const filteredBets = feed?.bets
    ? feed.bets.filter((bet) => {
        const matchesTier = filter === 'all' || bet.tier === filter;
        const matchesCategory =
          categoryFilter === 'all' || bet.marketCategory === categoryFilter;
        return matchesTier && matchesCategory;
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
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        availableCategories={availableCategories}
        streamPaused={streamPaused}
        setStreamPaused={setStreamPaused}
        tierCounts={feed?.tierCounts}
      />

      {/* Section 3: Telemetry Log Grid */}
      <FeedTable bets={filteredBets} isLoading={isLoading} />
    </div>
  );
}
