"use client";

import { SwapWidget } from "@/components/swap/SwapWidget";
import { Zap, Shield, Info } from "lucide-react";

const INFO_CARDS = [
  { icon: Zap,    title: "Best Price Routing", desc: "0x aggregates liquidity from 100+ DEXes and AMMs to guarantee the best available rate on every swap.", color: "green" as const },
  { icon: Shield, title: "Non-Custodial",       desc: "Trades execute directly from your wallet. Your keys, your tokens — no intermediaries.",              color: "blue"  as const },
  { icon: Info,   title: "Platform Fee",         desc: "A 0.3% fee is applied to each swap. This fee supports protocol development and liquidity.",          color: "blue"  as const },
];

export default function SwapPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1
          className="text-3xl lg:text-4xl font-display font-bold mb-3"
          style={{ background: "linear-gradient(90deg, var(--neon-green), var(--neon-blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Swap Tokens
        </h1>
        <p className="text-sm font-body text-text-secondary">Instantly swap any token across supported chains.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <SwapWidget />

        <div className="space-y-3">
          {INFO_CARDS.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="rounded-xl p-4"
              style={{
                background: color === "green" ? "var(--bg-input-g)" : "var(--bg-input)",
                border:     `1px solid ${color === "green" ? "var(--border-g1)" : "var(--border-1)"}`,
                boxShadow:  "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} style={{ color: color === "green" ? "var(--neon-green)" : "var(--neon-blue)" }} />
                <span className="text-xs font-mono font-bold" style={{ color: color === "green" ? "var(--neon-green)" : "var(--neon-blue)" }}>
                  {title}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
