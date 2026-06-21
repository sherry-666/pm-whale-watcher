'use client';

import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { FlaggedBet, FeedResponse } from '../types';

export function useEventStream(streamPaused: boolean) {
  const { mutate } = useSWRConfig();
  const bufferRef = useRef<FlaggedBet[]>([]);

  // Flush buffer to cache when stream is resumed (transition from paused -> streaming)
  useEffect(() => {
    if (!streamPaused && bufferRef.current.length > 0) {
      const pendingBets = [...bufferRef.current];
      bufferRef.current = [];

      mutate('/api/feed', (currentData: FeedResponse | undefined) => {
        if (!currentData) return currentData;

        // Prepend pending bets, maintaining uniqueness
        const mergedBets = [...pendingBets, ...currentData.bets];
        const uniqueMap = new Map<string, FlaggedBet>();
        
        mergedBets.forEach((b) => {
          if (!uniqueMap.has(b.id)) {
            uniqueMap.set(b.id, b);
          }
        });

        const uniqueBets = Array.from(uniqueMap.values());

        // Sort descending by date
        uniqueBets.sort((a, b) => new Date(b.betAt).getTime() - new Date(a.betAt).getTime());

        const all = uniqueBets.length;
        const SHARK = uniqueBets.filter(b => b.tier === 'SHARK').length;
        const WHALE = uniqueBets.filter(b => b.tier === 'WHALE').length;
        const MEGA_WHALE = uniqueBets.filter(b => b.tier === 'MEGA_WHALE').length;

        return {
          ...currentData,
          bets: uniqueBets.slice(0, 100),
          tierCounts: { all, SHARK, WHALE, MEGA_WHALE },
        };
      }, false);
    }
  }, [streamPaused, mutate]);

  useEffect(() => {
    // Connect to Server-Sent Events endpoint
    const eventSource = new EventSource('/api/stream');

    eventSource.addEventListener('new_bet', (event) => {
      try {
        const newBet: FlaggedBet = JSON.parse(event.data);
        
        // Inject a temporary runtime property to trigger visual insertion flash
        const annotatedBet = { ...newBet, isNew: true } as FlaggedBet;

        if (streamPaused) {
          // Store in buffer if the user paused updates
          bufferRef.current.unshift(annotatedBet);
        } else {
          // Inject directly into the SWR Cache
          mutate('/api/feed', (currentData: FeedResponse | undefined) => {
            if (!currentData) return currentData;

            const updated = [annotatedBet, ...currentData.bets.filter(b => b.id !== newBet.id)];

            const all = updated.length;
            const SHARK = updated.filter(b => b.tier === 'SHARK').length;
            const WHALE = updated.filter(b => b.tier === 'WHALE').length;
            const MEGA_WHALE = updated.filter(b => b.tier === 'MEGA_WHALE').length;

            return {
              ...currentData,
              bets: updated.slice(0, 100),
              tierCounts: { all, SHARK, WHALE, MEGA_WHALE },
            };
          }, false);
        }
      } catch (err) {
        console.error('Failed to parse incoming SSE new_bet payload:', err);
      }
    });

    eventSource.addEventListener('error', (err) => {
      console.warn('SSE feed disconnected. Reconnecting...', err);
    });

    return () => {
      eventSource.close();
    };
  }, [streamPaused, mutate]);
}
