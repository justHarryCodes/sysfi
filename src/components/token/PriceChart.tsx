"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  CandlestickChart,
  BarChart2,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { usePriceHistory, type PricePoint } from "@/hooks/usePriceHistory";
import { useETHUSD } from "@/hooks/useETHPrice";
import { formatUSD } from "@/lib/utils";
import { useChainId } from "wagmi";

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = "1h" | "6h" | "24h" | "7d" | "all";
type ChartType = "candle" | "line";

const RANGE_SECONDS: Record<Range, number> = {
  "1h": 3600,
  "6h": 21600,
  "24h": 86400,
  "7d": 86400 * 7,
  all: Infinity,
};

const CANDLE_INTERVAL: Record<Range, number> = {
  "1h": 60, // 1-min candles
  "6h": 300, // 5-min candles
  "24h": 900, // 15-min candles
  "7d": 3600, // 1-hr candles
  all: 3600 * 4, // 4-hr candles
};

interface OHLCV {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

function buildCandles(points: PricePoint[], intervalSecs: number): OHLCV[] {
  if (points.length === 0) return [];

  const buckets = new Map<number, PricePoint[]>();

  for (const p of points) {
    const bucket = Math.floor(p.time / intervalSecs) * intervalSecs;
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket)!.push(p);
  }

  const candles: OHLCV[] = [];

  for (const [bucket, pts] of [...buckets.entries()].sort(
    ([a], [b]) => a - b,
  )) {
    const prices = pts.map((p) => p.priceETH);
    const vol = pts.reduce((s, p) => s + p.ethVolume, 0);
    candles.push({
      time: bucket as UTCTimestamp,
      open: prices[0],
      high: Math.max(...prices),
      low: Math.min(...prices),
      close: prices[prices.length - 1],
      volume: vol,
    });
  }

  return candles;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a price in ETH/token to USD using the live ETH/USD rate.
 * Falls back to 0 if ethUSD is not yet loaded (avoids NaN in the UI).
 */
function toUSD(priceETH: number, ethUSD: number): number {
  return priceETH * (ethUSD || 0);
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ minWidth: "72px" }}>
      <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-0.5">
        {label}
      </span>
      <span
        className="text-[11px] font-mono font-bold"
        style={{
          color:
            positive === undefined
              ? "var(--neon-blue)"
              : positive
                ? "var(--neon-green)"
                : "#ff2d78",
        }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[9px] font-mono text-text-muted">{sub}</span>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PriceChartProps {
  poolAddr: `0x${string}` | undefined;
  /**
   * The contract's currentPrice() return value — wei per whole token.
   * i.e. the result of LaunchPool._priceInWei(virtualETH).
   * Unit: wei  (NOT raw virtualETH, NOT an ETH amount).
   * Divide by 1e18 to get ETH/token as a float.
   */
  currentPriceWei: bigint;
}

// ─── Main chart component ─────────────────────────────────────────────────────

export default function PriceChart({
  poolAddr,
  currentPriceWei,
}: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineRef = useRef<ISeriesApi<"Area"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [range, setRange] = useState<Range>("24h");
  const [chartType, setChartType] = useState<ChartType>("candle");
  const [hoveredOHLC, setHoveredOHLC] = useState<OHLCV | null>(null);

  const chainId = useChainId();
  const ethUSD = useETHUSD(chainId) ?? 0; // safe fallback — never undefined downstream

  const { points, loading } = usePriceHistory(poolAddr);

  // ── Append current live price as the latest synthetic point ──────────────
  //
  // currentPriceWei is the output of LaunchPool.currentPrice() which calls
  // _priceInWei(virtualETH) → returns wei-denominated price per whole token.
  // Dividing by 1e18 gives ETH/token as a float, matching PricePoint.priceETH.
  //
  // DO NOT pass currentPriceWei through priceFromVirtualETH() — it is already
  // the computed price, not a virtualETH reserve value.
  const currentPriceETH = Number(currentPriceWei) / 1e18;

  const allPoints: PricePoint[] = useMemo(() => {
    if (currentPriceWei === 0n) return points; // pool not yet initialized

    const livePoint: PricePoint = {
      time: Math.floor(Date.now() / 1000),
      priceETH: currentPriceETH,
      type: "buy",
      ethVolume: 0,
      blockNumber: 0n,
    };
    return [...points, livePoint];
  }, [points, currentPriceWei, currentPriceETH]);

  // ── Filter to selected range ──────────────────────────────────────────────
  const rangePoints = useMemo(() => {
    if (range === "all") return allPoints;
    const cutoff = Math.floor(Date.now() / 1000) - RANGE_SECONDS[range];
    return allPoints.filter((p) => p.time >= cutoff);
  }, [allPoints, range]);

  // ── Build OHLCV candles ───────────────────────────────────────────────────
  const candles = useMemo(
    () => buildCandles(rangePoints, CANDLE_INTERVAL[range]),
    [rangePoints, range],
  );

  // ── Area series data (close prices) ──────────────────────────────────────
  const lineData = useMemo(
    () => candles.map((c) => ({ time: c.time, value: c.close })),
    [candles],
  );

  // ── Volume histogram data ─────────────────────────────────────────────────
  const volumeData: HistogramData[] = useMemo(
    () =>
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color:
          c.close >= c.open ? "rgba(0,255,135,0.3)" : "rgba(255,45,120,0.3)",
      })),
    [candles],
  );

  // ── Price change for selected range ───────────────────────────────────────
  const priceChange = useMemo(() => {
    if (candles.length < 2) return null;
    const first = candles[0].open;
    const last = candles[candles.length - 1].close;
    if (!first) return null;
    return ((last - first) / first) * 100;
  }, [candles]);

  const currentCandle = hoveredOHLC ?? candles[candles.length - 1] ?? null;

  // ── Create chart once ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#475569",
        fontSize: 10,
        fontFamily: "'Space Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(0,212,255,0.04)" },
        horzLines: { color: "rgba(0,212,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(0,212,255,0.5)",
          labelBackgroundColor: "#0d0d1f",
          style: LineStyle.Dashed,
          width: 1,
        },
        horzLine: {
          color: "rgba(0,212,255,0.5)",
          labelBackgroundColor: "#0d0d1f",
          style: LineStyle.Dashed,
          width: 1,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(0,212,255,0.1)",
        scaleMargins: { top: 0.06, bottom: 0.28 },
        entireTextOnly: true,
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(0,212,255,0.1)",
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 6,
        minBarSpacing: 0.5,
        rightOffset: 8,
        fixLeftEdge: false,
        lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (time: number) => {
          const d = new Date(time * 1000);
          if (range === "1h" || range === "6h") {
            return d.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }
          return d.toLocaleDateString([], { month: "short", day: "numeric" });
        },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { mouseWheel: true, pinch: true },
    });

    // Volume histogram — pinned to bottom 12% of chart
    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.88, bottom: 0 },
    });

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#00ff87",
      downColor: "#ff2d78",
      borderUpColor: "#00ff87",
      borderDownColor: "#ff2d78",
      wickUpColor: "rgba(0,255,135,0.8)",
      wickDownColor: "rgba(255,45,120,0.8)",
      priceLineColor: "rgba(0,212,255,0.35)",
      priceLineStyle: LineStyle.Dashed,
      wickVisible: true,
    });

    // Area / line series
    const areaSeries = chart.addAreaSeries({
      lineColor: "#00ff87",
      topColor: "rgba(0,255,135,0.2)",
      bottomColor: "rgba(0,255,135,0.0)",
      lineWidth: 2,
      crosshairMarkerBorderColor: "#00ff87",
      crosshairMarkerBackgroundColor: "#060611",
      priceLineColor: "rgba(0,212,255,0.35)",
      priceLineStyle: LineStyle.Dashed,
      lastValueVisible: true,
    });

    // Crosshair move → update OHLC display
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredOHLC(null);
        return;
      }
      const cd = param.seriesData.get(candleSeries) as
        | CandlestickData
        | undefined;
      if (cd) {
        setHoveredOHLC({
          time: cd.time as UTCTimestamp,
          open: cd.open,
          high: cd.high,
          low: cd.low,
          close: cd.close,
          volume: 0,
        });
      } else {
        setHoveredOHLC(null);
      }
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    lineRef.current = areaSeries;
    volumeRef.current = volSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      lineRef.current = null;
      volumeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // create once only

  // ── Feed data whenever candles / chartType change ─────────────────────────
  useEffect(() => {
    if (!candleRef.current || !lineRef.current || !volumeRef.current) return;
    if (candles.length === 0) return;

    if (chartType === "candle") {
      candleRef.current.setData(candles as CandlestickData[]);
      lineRef.current.setData([]);
    } else {
      lineRef.current.setData(lineData);
      candleRef.current.setData([]);
    }

    volumeRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candles, lineData, volumeData, chartType]);

  // ── Fit content when range changes ────────────────────────────────────────
  useEffect(() => {
    chartRef.current?.timeScale().fitContent();
  }, [range]);

  // ── USD price formatter for Y-axis ────────────────────────────────────────
  //
  // The chart library calls this with the series value, which is priceETH
  // (ETH per whole token). Multiply by ethUSD to get the USD display price.
  // Fall back to ethUSD=1 so the axis still shows sensible ETH values when
  // the price feed hasn't loaded yet.
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      localization: {
        priceFormatter: (priceETH: number) =>
          formatUSD(priceETH * (ethUSD || 1)),
      },
    });
  }, [ethUSD]);

  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <GlassCard className="p-4 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        {/* Left: title + live OHLC readout */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: "var(--neon-green)" }} />
            <span className="text-xs font-mono font-bold text-text-primary">
              Price Chart
            </span>

            {priceChange !== null && (
              <span
                className="flex items-center gap-0.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: isPositive
                    ? "rgba(0,255,135,0.1)"
                    : "rgba(255,45,120,0.1)",
                  border: `1px solid ${isPositive ? "rgba(0,255,135,0.25)" : "rgba(255,45,120,0.25)"}`,
                  color: isPositive ? "var(--neon-green)" : "#ff2d78",
                }}
              >
                {isPositive ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {isPositive ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            )}
          </div>

          {/* OHLCV — updates on hover, falls back to last candle */}
          {currentCandle && (
            <div className="flex items-center gap-3 flex-wrap">
              {/* All StatPills now guard against ethUSD=0 via toUSD() */}
              <StatPill
                label="O"
                value={formatUSD(toUSD(currentCandle.open, ethUSD))}
                positive={currentCandle.close >= currentCandle.open}
              />
              <StatPill
                label="H"
                value={formatUSD(toUSD(currentCandle.high, ethUSD))}
                positive
              />
              <StatPill
                label="L"
                value={formatUSD(toUSD(currentCandle.low, ethUSD))}
                positive={false}
              />
              <StatPill
                label="C"
                value={formatUSD(toUSD(currentCandle.close, ethUSD))}
                positive={currentCandle.close >= currentCandle.open}
              />
              {currentCandle.volume > 0 && (
                <StatPill
                  label="Vol"
                  value={`${currentCandle.volume.toFixed(3)} ETH`}
                />
              )}
            </div>
          )}
        </div>

        {/* Right: chart type + range controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Candle / line toggle */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            <button
              onClick={() => setChartType("candle")}
              className="p-1.5 rounded-md transition-all"
              title="Candlestick"
              style={
                chartType === "candle"
                  ? {
                      background: "rgba(0,212,255,0.15)",
                      color: "var(--neon-blue)",
                    }
                  : { color: "#475569" }
              }
            >
              <CandlestickChart size={14} />
            </button>
            <button
              onClick={() => setChartType("line")}
              className="p-1.5 rounded-md transition-all"
              title="Area line"
              style={
                chartType === "line"
                  ? {
                      background: "rgba(0,212,255,0.15)",
                      color: "var(--neon-blue)",
                    }
                  : { color: "#475569" }
              }
            >
              <BarChart2 size={14} />
            </button>
          </div>

          {/* Range pills */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{ background: "rgba(0,0,0,0.3)" }}
          >
            {(["1h", "6h", "24h", "7d", "all"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="px-2 py-1 rounded-md text-[10px] font-mono font-bold transition-all"
                style={
                  range === r
                    ? {
                        background: "rgba(0,212,255,0.15)",
                        border: "1px solid rgba(0,212,255,0.3)",
                        color: "var(--neon-blue)",
                      }
                    : { color: "#475569" }
                }
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart canvas ───────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(0,212,255,0.06)",
        }}
      >
        {/* Loading overlay */}
        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl"
            style={{
              background: "rgba(6,6,17,0.7)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: "var(--neon-blue)" }}
              />
              Loading chart data…
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && candles.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(0,212,255,0.08)",
                border: "1px solid rgba(0,212,255,0.15)",
              }}
            >
              <CandlestickChart
                size={18}
                style={{ color: "var(--neon-blue)" }}
              />
            </div>
            <p className="text-sm font-mono text-text-muted">
              No trade history yet
            </p>
            <p className="text-[11px] text-text-muted">
              Chart populates after the first trade
            </p>
          </div>
        )}

        {/* TradingView canvas */}
        <div
          ref={containerRef}
          style={{
            height: "380px",
            width: "100%",
            opacity: candles.length === 0 ? 0 : 1,
          }}
        />
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: "#00ff87" }}
            />
            Bullish
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: "#ff2d78" }}
            />
            Bearish
          </span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          Powered by TradingView Lightweight Charts
        </span>
      </div>
    </GlassCard>
  );
}
