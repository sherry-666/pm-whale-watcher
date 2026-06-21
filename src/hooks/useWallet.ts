'use client';

import useSWR from 'swr';
import { WalletResponse } from '../types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWallet(address: string) {
  const { data, error, isLoading, mutate } = useSWR<WalletResponse>(
    address ? `/api/wallet/${address.toLowerCase()}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  );

  return {
    wallet: data,
    isLoading,
    isError: error,
    mutate,
  };
}
