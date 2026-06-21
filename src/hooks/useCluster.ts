'use client';

import useSWR from 'swr';
import { ClusterResponse } from '../types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCluster(id: string) {
  const { data, error, isLoading } = useSWR<ClusterResponse>(
    id ? `/api/cluster/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  );

  return {
    cluster: data,
    isLoading,
    isError: error,
  };
}
