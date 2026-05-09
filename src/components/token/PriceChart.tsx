"use client";

import { useMemo, useState }      from "react";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { format }                  from "date-fns";
import { Loader2, TrendingUp }     from "lucide-react";
import GlassCard                   from "@/components/ui/GlassCard";
import { usePriceHistory, type PricePoint } from "@/hooks/usePriceHistory";
import { useETHUSD }               from "@/hooks/useETHPrice";
import { formatUSD }               from "@/lib/utils";

type Range = "1h" | "24h" | "7d" | "all";

const RANGE_SECONDS: Record<Range, number> = {
  "1h":  3600,
  "24h": 86400,
  "7d":  86400 * 7,
  "all": Infinity,
};

interface ChartPoint {
  time:    number;
  priceETH:number;
  priceUSD:number;
  type?:   "buy" | "sell";
  vol:     number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: ChartPoint }> }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-mono"
      style={{
        background:    "rgba(13,13,31,0.98)",
        border:        "1px solid rgba(0,212,255,0.2)",
        backdropFilter:"blur(20px)",
        boxShadow:     "0 4px 20px rgba(0,0,0,0.5)",
      }}>
      <p className="text-text-muted mb-1.5">{format(d.time * 1000, "MMM d, HH:mm:ss")}</p>
      <p style={{ color: "var(--neon-green)" }}>
        {d.priceETH.toPrecision(5)} ETH
      </p>
      <p style={{ color: "var(--neon-blue)" }}>{formatUSD(d.priceUSD)}</p>
      {d.vol > 0 && (
        <p className="text-text-muted mt-1">Vol: {d.vol.toFixed(4)} ETH</p>
      )}
    </div>
  );
}

interface PriceChartProps {
  poolAddr: `0x${string}` | undefined;
  currentPriceWei: bigint;
}

export default function PriceChart({ poolAddr, currentPriceWei }: PriceChartProps) {
  const [range, setRange] = useState<Range>("all");
  const ethUSD = useETHUSD();

  const { points, loading, error } = usePriceHistory(poolAddr);

  // Add current price as latest point
  const allPoints: PricePoint[] = useMemo(() => {
    const now:  PricePoint = {
      time:        Math.floor(Date.now() / 1000),
      priceETH:    Number(currentPriceWei) / 1e18,
      type:        "buy",
      ethVolume:   0,
      blockNumber: 0n,
    };
    return [...points, now];
  }, [points, currentPriceWei]);

  // Filter by range and build chart data
  const chartData: ChartPoint[] = useMemo(() => {
    const cutoff = range === "all"
      ? 0
      : Math.floor(Date.now() / 1000) - RANGE_SECONDS[range];

    const filtered = allPoints.filter(p => p.time >= cutoff);
    if (filtered.length === 0) return [];

    return filtered.map(p => ({
      time:     p.time,
      priceETH: p.priceETH,
      priceUSD: p.priceETH * ethUSD,
      type:     p.type,
      vol:      p.ethVolume,
    }));
  }, [allPoints, range, ethUSD]);

  // Price change for the selected range
  const priceChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].priceETH;
    const last  = chartData[chartData.length - 1].priceETH;
    if (first === 0) return null;
    return ((last - first) / first) * 100;
  }, [chartData]);

  const RANGES: Range[] = ["1h", "24h", "7d", "all"];

  if (loading) {
    return (
      <GlassCard className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-text-secondary font-mono text-sm">
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--neon-blue)" }} />
          Loading price history…
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: "var(--neon-green)" }} />
          <span className="text-sm font-mono font-bold text-text-primary">Price Chart</span>
          {priceChange !== null && (
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
              style={{
                background: priceChange >= 0 ? "rgba(0,255,135,0.1)" : "rgba(255,45,120,0.1)",
                border:     `1px solid ${priceChange >= 0 ? "rgba(0,255,135,0.25)" : "rgba(255,45,120,0.25)"}`,
                color:      priceChange >= 0 ? "var(--neon-green)" : "#ff2d78",
              }}
            >
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Range selector */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.3)" }}>
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-2.5 py-1 rounded-md text-[11px] font-mono transition-all"
              style={range === r ? {
                background: "rgba(0,212,255,0.15)",
                border:     "1px solid rgba(0,212,255,0.3)",
                color:      "var(--neon-blue)",
              } : { color: "#475569" }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {chartData.length < 2 ? (
        <div className="h-48 flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.15)" }}>
            <TrendingUp size={14} style={{ color: "var(--neon-blue)" }} />
          </div>
          <p className="text-sm font-mono text-text-muted">No trade history yet</p>
          <p className="text-xs text-text-muted">Chart builds from the first trade</p>
        </div>
      ) : (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#00ff87" stopOpacity={0.3} />
                  <stop offset="60%"  stopColor="#00d4ff" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,212,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "'Space Mono'" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={t => {
                  const d = new Date(t * 1000);
                  return range === "1h" || range === "24h"
                    ? format(d, "HH:mm")
                    : format(d, "MMM d");
                }}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 10, fontFamily: "'Space Mono'" }}
                tickLine={false}
                axisLine={false}
                width={70}
                tickFormatter={v => {
                  const usd = v * (ethUSD || 1);
                  return formatUSD(usd);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="priceETH"
                stroke="#00ff87"
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{
                  r:           5,
                  fill:        "#00ff87",
                  stroke:      "#060611",
                  strokeWidth: 2,
                }}
              />
              {/* Mark buys and sells */}
              {chartData
                .filter(p => p.type === "buy" && p.vol > 0)
                .slice(-20)
                .map((p, i) => (
                  <ReferenceDot
                    key={`b${i}`}
                    x={p.time}
                    y={p.priceETH}
                    r={3}
                    fill="#00ff87"
                    stroke="none"
                    opacity={0.7}
                  />
                ))}
              {chartData
                .filter(p => p.type === "sell")
                .slice(-20)
                .map((p, i) => (
                  <ReferenceDot
                    key={`s${i}`}
                    x={p.time}
                    y={p.priceETH}
                    r={3}
                    fill="#ff2d78"
                    stroke="none"
                    opacity={0.7}
                  />
                ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-end">
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
          <span className="w-2 h-2 rounded-full" style={{ background: "#00ff87" }} /> Buy
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
          <span className="w-2 h-2 rounded-full" style={{ background: "#ff2d78" }} /> Sell
        </span>
      </div>
    </GlassCard>
  );
}
