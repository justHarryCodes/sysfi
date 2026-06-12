"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rocket, Users, TrendingUp, TrendingDown } from "lucide-react";
import { useTrending, type TrendingCoin } from "@/hooks/useTrending";

// ── Sparkline (CoinGecko returns inline SVG in data.sparkline) ────────────────

function Sparkline({ coin }: { coin: TrendingCoin }) {
  const svg = (coin.data as Record<string, unknown>)?.sparkline as string | undefined;
  const pct = coin.data?.price_change_percentage_24h?.usd ?? 0;
  const isUp = pct >= 0;

  if (svg) {
    return (
      <div
        className="w-16 h-8 flex-shrink-0 overflow-hidden"
        // CoinGecko-sourced SVG — colors stripped via CSS filter
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ opacity: 0.9 }}
      />
    );
  }

  return (
    <div className="w-10 flex-shrink-0 flex items-center justify-end">
      {isUp
        ? <TrendingUp  size={14} style={{ color: "var(--neon-green)" }} />
        : <TrendingDown size={14} style={{ color: "#ff4d4d" }} />}
    </div>
  );
}

// ── Trending Panel (Swap route) ───────────────────────────────────────────────

function TrendingPanel() {
  const { coins, loading } = useTrending();

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-1)" }}>
        <p className="text-xs font-bold font-mono" style={{ color: "var(--neon-blue)" }}>
          Trending · 24h
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="mx-3 my-1.5 h-9 rounded-lg animate-pulse"
                style={{ background: "var(--bg-input)" }}
              />
            ))
          : coins.slice(0, 12).map((coin, i) => {
              const pct = coin.data?.price_change_percentage_24h?.usd ?? null;
              const isUp = pct !== null && pct >= 0;

              return (
                <div
                  key={coin.id}
                  className="flex items-center gap-2 px-3 py-2 mx-1 rounded-lg transition-all"
                  style={{ cursor: "default" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-input)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                >
                  <span className="text-[10px] font-mono text-text-muted w-4 flex-shrink-0 text-right">{i + 1}</span>

                  {coin.thumb && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coin.thumb} alt={coin.symbol} className="w-5 h-5 rounded-full flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-text-primary truncate leading-tight">{coin.name}</p>
                    <p className="text-[9px] font-mono text-text-muted uppercase">{coin.symbol}</p>
                  </div>

                  <Sparkline coin={coin} />

                  {pct !== null && (
                    <span
                      className="text-[10px] font-mono font-bold w-[3.5rem] text-right flex-shrink-0"
                      style={{ color: isUp ? "var(--neon-green)" : "#ff4d4d" }}
                    >
                      {isUp ? "+" : ""}{pct.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}

// ── Launch Token Panel (Meme Rush / explore route) ────────────────────────────

function LaunchTokenPanel() {
  return (
    <div className="p-5 flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1">Quick action</p>
        <h3
          className="text-base font-bold"
          style={{ color: "var(--neon-green)", fontFamily: "'Outfit', sans-serif" }}
        >
          Launch a Token
        </h3>
        <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
          Deploy a bonding-curve meme token in under 60 seconds. No upfront liquidity required.
        </p>
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
        {["Zero upfront liquidity", "Automatic price discovery", "Instant trading on launch", "Graduates to DEX at cap"].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span style={{ color: "var(--neon-green)", fontSize: 10 }}>✦</span>
            <p className="text-[11px] font-mono text-text-secondary">{f}</p>
          </div>
        ))}
      </div>

      <Link
        href="/launch"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold font-mono transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "var(--bg-input-g)",
          border:     "1px solid var(--border-g2)",
          color:      "var(--neon-green)",
          boxShadow:  "0 0 16px rgba(0,255,135,0.08)",
        }}
      >
        <Rocket size={14} />
        Launch Token
      </Link>
    </div>
  );
}

// ── Launch DAO Panel (DAO route) ──────────────────────────────────────────────

function LaunchDAOPanel() {
  return (
    <div className="p-5 flex flex-col gap-5">
      <div>
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1">Quick action</p>
        <h3
          className="text-base font-bold"
          style={{ color: "var(--neon-blue)", fontFamily: "'Outfit', sans-serif" }}
        >
          Create a DAO
        </h3>
        <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed">
          Deploy on-chain governance for your community. Set rules, create proposals, and vote.
        </p>
      </div>

      <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)" }}>
        {["On-chain governance", "Customizable voting rules", "Community proposals", "Multi-chain support"].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span style={{ color: "var(--neon-blue)", fontSize: 10 }}>✦</span>
            <p className="text-[11px] font-mono text-text-secondary">{f}</p>
          </div>
        ))}
      </div>

      <Link
        href="/dao/create"
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold font-mono transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          background: "var(--bg-input)",
          border:     "1px solid var(--border-2)",
          color:      "var(--neon-blue)",
          boxShadow:  "0 0 16px rgba(0,212,255,0.08)",
        }}
      >
        <Users size={14} />
        Create DAO
      </Link>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function RightPanel() {
  const pathname = usePathname();

  let content: React.ReactNode = null;

  if (pathname === "/" || pathname.startsWith("/token")) {
    content = <LaunchTokenPanel />;
  } else if (pathname.startsWith("/dao")) {
    content = <LaunchDAOPanel />;
  } else if (pathname.startsWith("/swap")) {
    content = <TrendingPanel />;
  } else {
    return null;
  }

  return (
    <aside
      className="hidden lg:flex flex-col fixed right-0 z-20 overflow-hidden"
      style={{
        top:           "calc(2rem + 56px)",
        bottom:        0,
        width:         "288px",
        background:    "var(--bg-nav)",
        borderLeft:    "1px solid var(--border-1)",
        backdropFilter: "blur(20px)",
        boxShadow:     "var(--shadow-nav)",
      }}
    >
      {content}
    </aside>
  );
}
