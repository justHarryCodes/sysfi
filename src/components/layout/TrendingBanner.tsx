"use client";

import Image from "next/image";
import { useTrending } from "@/hooks/useTrending";

function CoinTicker({ coin }: { coin: import("@/hooks/useTrending").TrendingCoin }) {
  const change  = coin.data?.price_change_percentage_24h?.usd ?? 0;
  const isPos   = change >= 0;
  const price   = coin.data?.price ?? "";

  return (
    <span className="inline-flex items-center gap-2 px-5 py-0.5 select-none">
      {/* Icon */}
      {coin.thumb && (
        <Image
          src={coin.thumb}
          alt={coin.symbol}
          width={16}
          height={16}
          className="rounded-full opacity-90"
          unoptimized
        />
      )}

      {/* Rank badge */}
      <span className="text-[10px] font-mono text-text-secondary">
        #{coin.score + 1}
      </span>

      {/* Symbol */}
      <span className="text-xs font-mono font-bold tracking-wide text-text-primary uppercase">
        {coin.symbol}
      </span>

      {/* Price */}
      {price && (
        <span className="text-xs font-mono text-text-secondary">{price}</span>
      )}

      {/* 24h change */}
      <span
        className={`text-[11px] font-mono font-bold ${
          isPos ? "text-neon-green" : "text-neon-pink"
        }`}
        style={{
          textShadow: isPos
            ? "0 0 8px rgba(0,255,135,0.5)"
            : "0 0 8px rgba(255,45,120,0.5)",
        }}
      >
        {isPos ? "+" : ""}
        {change.toFixed(2)}%
      </span>

      {/* Separator */}
      <span className="text-text-muted mx-1 opacity-40">•</span>
    </span>
  );
}

export default function TrendingBanner() {
  const { coins, loading, error } = useTrending();

  if (error || (!loading && coins.length === 0)) {
    return (
      <div className="h-8 border-b border-border-glass flex items-center justify-center">
        <span className="text-[11px] text-text-muted font-mono">
          Trending data unavailable
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-8 border-b border-border-glass flex items-center">
        <div className="flex gap-6 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded animate-pulse"
              style={{
                width:     `${48 + (i % 3) * 16}px`,
                background: "rgba(0,212,255,0.08)",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Duplicate array for seamless infinite scroll
  const doubled = [...coins, ...coins];

  return (
    <div
      className="h-8 border-b overflow-hidden relative ticker-wrap"
      style={{ borderColor: "rgba(0,212,255,0.1)" }}
    >
      {/* Left fade */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, #060611 0%, transparent 100%)" }}
      />

      {/* Label */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 flex items-center px-3"
        style={{
          background:  "rgba(6,6,17,0.95)",
          borderRight: "1px solid rgba(0,212,255,0.1)",
        }}
      >
        <span
          className="text-[10px] font-mono font-bold tracking-widest uppercase"
          style={{ color: "var(--neon-blue)" }}
        >
          🔥 Hot
        </span>
      </div>

      {/* Scrolling track */}
      <div
        className="ticker-inner flex items-center h-full animate-ticker pl-24 whitespace-nowrap"
        style={{ width: "max-content" }}
      >
        {doubled.map((coin, i) => (
          <CoinTicker key={`${coin.id}-${i}`} coin={coin} />
        ))}
      </div>

      {/* Right fade */}
      <div
        className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(270deg, #060611 0%, transparent 100%)" }}
      />
    </div>
  );
}
