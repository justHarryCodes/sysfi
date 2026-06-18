"use client";

import BridgeMintPanel from "@/components/bridge/BridgeMintPanel";

export default function BridgePage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1
          className="text-3xl lg:text-4xl font-display font-bold mb-2"
          style={{
            background:           "linear-gradient(90deg, var(--neon-green), var(--neon-blue))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor:  "transparent",
          }}
        >
          Bridge SYN → WSYN
        </h1>
        <p className="text-sm text-text-secondary max-w-xl">
          Convert your registered SYN balance into Wrapped SYN (WSYN) tokens on Base Mainnet.
          Each account is capped at{" "}
          <span className="font-mono font-semibold" style={{ color: "var(--neon-green)" }}>10,000 WSYN</span>.
        </p>
      </div>

      <BridgeMintPanel />
    </div>
  );
}
