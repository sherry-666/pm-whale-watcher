'use client';

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../lib/formatting';

interface PnlChartProps {
  data: { date: string; pnl: number }[];
}

export const PnlChart: React.FC<PnlChartProps> = ({ data }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[200px] bg-ww-bg-surface border border-ww-border rounded flex items-center justify-center text-[10px] text-ww-text-ghost uppercase font-mono animate-pulse">
        initializing telemetry chart engine...
      </div>
    );
  }

  // Determine chart theme color based on current net P&L
  const latestPnl = data.length > 0 ? data[data.length - 1].pnl : 0;
  const isProfit = latestPnl >= 0;
  const strokeColor = isProfit ? '#00e5a0' : '#ff5c7a';
  const fillGradientId = `pnlFillGradient-${isProfit ? 'profit' : 'loss'}`;

  // Custom Tooltip component
  interface CustomTooltipProps {
    active?: boolean;
    payload?: { value: number; payload: { date: string } }[];
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      return (
        <div className="bg-ww-bg-bar border border-ww-border px-3 py-2 text-[10px] font-mono rounded shadow-lg">
          <div className="text-ww-text-ghost uppercase tracking-wider">Cumulative P/L</div>
          <div className={`text-xs font-bold mt-1 ${value >= 0 ? 'text-ww-accent-green' : 'text-ww-side-no'}`}>
            {formatCurrency(value)}
          </div>
          <div className="text-ww-text-dim text-[9px] mt-0.5">{payload[0].payload.date}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-ww-bg-surface border border-ww-border p-6 rounded flex flex-col justify-between font-mono h-full">
      <div>
        <h3 className="text-[10px] font-bold text-ww-text-ghost uppercase tracking-widest mb-1">
          CUMULATIVE REALIZED P/L
        </h3>
        <div className={`text-lg font-bold ${isProfit ? 'text-ww-accent-green' : 'text-ww-side-no'}`}>
          {formatCurrency(latestPnl)}
        </div>
      </div>

      <div className="w-full h-[160px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.18} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#121925" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#3a4452"
              tickLine={false}
              axisLine={false}
              style={{ fontSize: 8, fontFamily: 'monospace' }}
            />
            <YAxis
              stroke="#3a4452"
              tickLine={false}
              axisLine={false}
              style={{ fontSize: 8, fontFamily: 'monospace' }}
              tickFormatter={(val) => formatCurrency(val, true)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1a2230', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={strokeColor}
              strokeWidth={1.5}
              fillOpacity={1}
              fill={`url(#${fillGradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
