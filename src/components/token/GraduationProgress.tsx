"use client";

import { Zap, CheckCircle2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { formatETH, formatUSD, weiToUSD, graduationPercent } from "@/lib/utils";
import { parseEther } from "viem";

interface Props {
  poolETH:               bigint;
  graduated:             boolean;
  ethUSD?:               number;
  nativeCurrencyLabel?:  string;
}

const TARGET = parseEther("10");

export default function GraduationProgress({ poolETH, graduated, ethUSD = 0, nativeCurrencyLabel = "ETH" }: Props) {
  const pct        = graduationPercent(poolETH);
  const isNear     = pct >= 80;
  const raisedUSD  = ethUSD ? formatUSD(weiToUSD(poolETH, ethUSD)) : null;
  const targetUSD  = ethUSD ? formatUSD(10 * ethUSD) : null;

  if (graduated) {
    return (
      <GlassCard glow="green" className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={16} style={{ color: "var(--neon-green)" }} />
          <span className="text-sm font-mono font-bold" style={{ color: "var(--neon-green)" }}>Graduated to Uniswap V3</span>
        </div>
        <p className="text-xs text-text-secondary font-body">LP permanently locked in Uniswap V3.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Zap size={14} style={{ color: isNear ? "var(--neon-green)" : "var(--neon-blue)", filter: isNear ? "drop-shadow(0 0 6px var(--neon-green))" : "none" }} />
          <span className="text-xs font-mono text-text-secondary">Graduation Progress</span>
        </div>
        <span className="text-xs font-mono font-bold" style={{ color: isNear ? "var(--neon-green)" : "var(--neon-blue)" }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.05)" }}>
        <div className="h-full rounded-full progress-neon transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs font-mono">
        <div>
          <span className="text-text-muted">Raised: </span>
          <span className="text-text-primary">{formatETH(poolETH)} {nativeCurrencyLabel}</span>
          {raisedUSD && <span className="text-text-secondary ml-1">({raisedUSD})</span>}
        </div>
        <div>
          <span className="text-text-muted">Goal: </span>
          <span className="text-text-primary">{formatETH(TARGET)} {nativeCurrencyLabel}</span>
          {targetUSD && <span className="text-text-secondary ml-1">({targetUSD})</span>}
        </div>
      </div>
      {isNear && <p className="mt-2 text-[11px] font-mono text-center animate-pulse" style={{ color: "var(--neon-green)" }}>⚡ Graduation imminent!</p>}
    </GlassCard>
  );
}
