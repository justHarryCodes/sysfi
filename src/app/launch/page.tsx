"use client";

import { Rocket, Zap } from "lucide-react";
import LaunchForm from "@/components/token/LaunchForm";

export default function LaunchPage() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full"
          style={{
            background: "rgba(0,255,135,0.06)",
            border:     "1px solid rgba(0,255,135,0.15)",
          }}
        >
          <Zap size={14} style={{ color: "var(--neon-green)" }} />
          <span className="text-xs font-mono" style={{ color: "var(--neon-green)" }}>
            Bonding Curve · Auto Uniswap V3 Graduation
          </span>
        </div>

        <h1
          className="text-3xl lg:text-4xl font-display font-bold mb-3"
          style={{
            background:          "linear-gradient(90deg, var(--neon-green), var(--neon-blue))",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Launch Your Token
        </h1>

        <p className="text-sm text-text-secondary font-body max-w-md mx-auto">
          Deploy an ERC-20 token with a built-in bonding curve. When it raises 10 ETH,
          it graduates automatically to a Uniswap V3 pool with locked liquidity.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-xl mx-auto">
        {[
          { step: "1", label: "Deploy",    desc: "Pay the creation fee to launch",  color: "blue"  },
          { step: "2", label: "Trade",     desc: "Bonding curve prices every buy",  color: "green" },
          { step: "3", label: "Graduate",  desc: "Auto-lists on Uniswap at 10 ETH", color: "blue"  },
        ].map(({ step, label, desc, color }) => (
          <div
            key={step}
            className="rounded-xl p-3 text-center"
            style={{
              background: color === "green"
                ? "rgba(0,255,135,0.04)" : "rgba(0,212,255,0.04)",
              border: `1px solid ${color === "green"
                ? "rgba(0,255,135,0.1)" : "rgba(0,212,255,0.1)"}`,
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-mono font-bold"
              style={{
                background: color === "green"
                  ? "rgba(0,255,135,0.15)" : "rgba(0,212,255,0.15)",
                color: color === "green" ? "var(--neon-green)" : "var(--neon-blue)",
              }}
            >
              {step}
            </div>
            <p className="text-xs font-mono font-bold text-text-primary mb-0.5">{label}</p>
            <p className="text-[11px] text-text-secondary">{desc}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <LaunchForm />
    </div>
  );
}
