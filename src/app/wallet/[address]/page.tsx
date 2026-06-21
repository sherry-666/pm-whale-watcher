'use client';

import React from 'react';
import { useWallet } from '../../../hooks/useWallet';
import { WalletHeader } from '../../../components/wallet/WalletHeader';
import { SuspicionGauge } from '../../../components/wallet/SuspicionGauge';
import { PnlChart } from '../../../components/wallet/PnlChart';
import { BetsTable } from '../../../components/wallet/BetsTable';

interface WalletPageProps {
  params: { address: string };
}

export default function WalletPage({ params }: WalletPageProps) {
  const { address } = params;
  const { wallet, isLoading } = useWallet(address);

  if (isLoading) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest animate-pulse">
        retrieving wallet telemetry data...
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="w-full h-96 flex items-center justify-center text-xs font-mono text-ww-text-ghost uppercase tracking-widest">
        wallet profile node not found
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Header Metadata */}
      <WalletHeader
        address={wallet.address}
        firstTradeAt={wallet.firstTradeAt}
        lifetimeTrades={wallet.lifetimeTrades}
        inCluster={wallet.inCluster}
        clusterId={wallet.clusterId}
      />

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <SuspicionGauge score={wallet.suspicionScore} />
        </div>
        <div className="md:col-span-2">
          <PnlChart data={wallet.cumulativePnlSeries} />
        </div>
      </div>

      {/* Flagged Transactions Grid */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest font-bold">
          FLAGGED ANOMALY TRANSACTION LOGS
        </h2>
        <BetsTable bets={wallet.bets} />
      </div>
    </div>
  );
}
