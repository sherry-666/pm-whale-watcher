'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useClock } from '../../hooks/useClock';
import { formatUTCClock } from '../../lib/formatting';

export const TopBar: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const clock = useClock();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if query looks like an address (0x...)
    if (query.toLowerCase().startsWith('0x') && query.length === 42) {
      router.push(`/wallet/${query.toLowerCase()}`);
      setSearchQuery('');
    } else {
      alert('Please enter a valid 42-character wallet address starting with 0x.');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-ww-bg-bar/90 border-b border-ww-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-ww-accent-green font-bold text-lg tracking-wider flex items-center gap-1.5">
            <span className="text-xl">🐋</span> WHALE WATCH
          </span>
          <span className="text-[9px] text-ww-text-muted border border-ww-border px-1 py-0.5 rounded-sm uppercase tracking-widest mt-0.5 font-bold">
            PROTOTYPE
          </span>
        </Link>

        {/* Center: Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Search wallet address (0x...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-ww-bg-input border border-ww-border focus:border-ww-accent-green/60 rounded pl-9 pr-4 py-1.5 text-xs text-ww-text-primary font-mono focus:outline-none placeholder-ww-text-ghost transition-all"
          />
          <Search className="w-3.5 h-3.5 text-ww-text-ghost absolute left-3 top-1/2 -translate-y-1/2" />
        </form>

        {/* Right: Stream status + Clock */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ww-accent-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-ww-accent-green"></span>
            </span>
            <span className="text-ww-accent-green font-bold uppercase tracking-wider text-[10px]">
              LIVE FEED
            </span>
          </div>

          <div className="text-xs font-mono text-ww-text-muted font-bold min-w-[90px] text-right">
            {clock ? formatUTCClock(clock) : '--:--:-- UTC'}
          </div>
        </div>
      </div>
    </header>
  );
};
