"use client";

import Image from "next/image";
import { useTrending } from "@/hooks/useTrending";
import { formatCryptoPrice } from "@/lib/utils";

function CoinTicker({ coin }: { coin: import("@/hooks/useTrending").TrendingCoin }) {
  const change    = coin.data?.price_change_percentage_24h?.usd ?? 0;
  const isPos     = change >= 0;
  const rawPrice  = coin.data?.price != null ? String(coin.data.price) : "";
  const priceNum  = rawPrice ? parseFloat(rawPrice.replace(/[$,]/g, "")) : NaN;
  const price     = isNaN(priceNum) ? rawPrice : formatCryptoPrice(priceNum);

  return (
    <span className="inline-flex items-center gap-2 px-5 py-0.5 select-none">
      {coin.thumb && (
        <Image src={coin.thumb} alt={coin.symbol} width={16} height={16} className="rounded-full opacity-90" unoptimized />
      )}
      <span className="text-[10px] font-mono text-text-secondary">#{coin.score + 1}</span>
      <span className="text-xs font-mono font-bold tracking-wide text-text-primary uppercase">{coin.symbol}</span>
      {price && (
        <span className="text-xs font-mono text-text-secondary">{price}</span>
      )}
      <span
        className="text-[11px] font-mono font-bold"
        style={{
          color:      isPos ? "var(--neon-green)" : "#ff2d78",
          textShadow: isPos ? "0 0 8px var(--border-g2)" : "0 0 8px rgba(255,45,120,0.5)",
        }}
      >
        {isPos ? "+" : ""}{change.toFixed(2)}%
      </span>
      <span className="text-text-muted mx-1 opacity-40">•</span>
    </span>
  );
}

export default function TrendingBanner() {
  const { coins, loading, error } = useTrending();

  const bannerBase = {
    borderBottom: "1px solid var(--border-1)",
    background:   "var(--bg-nav)",
    boxShadow:    "var(--shadow-nav)",
  };

  if (error || (!loading && coins.length === 0)) {
    return (
      <div className="h-8 flex items-center justify-center" style={bannerBase}>
        <span className="text-[11px] text-text-muted font-mono">Trending data unavailable</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-8 flex items-center" style={bannerBase}>
        <div className="flex gap-6 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{ width: `${48 + (i % 3) * 16}px`, background: "var(--bg-input)", animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const doubled = [...coins, ...coins];

  return (
    <div className="h-8 overflow-hidden relative ticker-wrap" style={bannerBase}>
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, var(--bg-nav) 0%, transparent 100%)" }}
      />

      {/* Label */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-3"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid var(--border-1)" }}
      >
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: "var(--neon-blue)" }}>
          🔥 Hot
        </span>
      </div>

      {/* Scrolling track */}
      <div
        className="ticker-inner flex items-center h-full animate-ticker pl-24 whitespace-nowrap"
        style={{ width: "max-content" }}
      >
        {doubled.map((coin, i) => <CoinTicker key={`${coin.id}-${i}`} coin={coin} />)}
      </div>

      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, var(--bg-nav) 0%, transparent 100%)" }}
      />
    </div>
  );
}
