'use client';

import useSWR from 'swr';
import { FeedResponse } from '../types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useFeed() {
  const { data, error, isLoading, mutate } = useSWR<FeedResponse>('/api/feed', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    feed: data,
    isLoading,
    isError: error,
    mutate,
  };
}
