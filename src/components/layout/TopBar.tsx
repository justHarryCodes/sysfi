"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/context/WalletContext";
import { useETHPrice } from "@/hooks/useETHPrice";
import ChainSwitcher from "./ChainSwitcher";
import { shortAddress, formatUSD } from "@/lib/utils";
import { useTheme } from "@/lib/theme";
import { AlertTriangle, Sun, Moon, Menu } from "lucide-react";
import Image from "next/image";

interface Props {
  onMenuClick: () => void;
}

export default function TopBar({ onMenuClick }: Props) {
  const { chainId, isConnected, isUnsupportedChain, balanceFormatted, chainMeta } = useWallet();
  const { usd: tokenUSD, usdChange24h, loading: priceLoading } = useETHPrice(chainId);
  const { theme, toggle } = useTheme();

  return (
    <header
      className="fixed top-8 left-0 right-0 lg:left-72 z-30 h-14 flex items-center justify-between px-4 lg:px-6"
      style={{
        background:            "rgba(255, 255, 255, 0.08)",
        borderBottom:          "1px solid rgba(255, 255, 255, 0.18)",
        backdropFilter:        "blur(28px)",
        WebkitBackdropFilter:  "blur(28px)",
        boxShadow:             "0 4px 32px rgba(0, 0, 0, 0.10)",
      }}
    >
      {/* Left: hamburger (mobile) + live price + mobile chain badge */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger — opens drawer */}
        <button
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
          onClick={onMenuClick}
          style={{ background: "var(--bg-input)", border: "1px solid var(--border-1)", color: "var(--c-text-2)" }}
        >
          <Menu size={16} />
        </button>

        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
          style={{
            background: priceLoading ? "var(--neon-blue)" : "var(--neon-green)",
            boxShadow:  `0 0 6px ${priceLoading ? "var(--neon-blue)" : "var(--neon-green)"}`,
          }}
        />

        {!priceLoading && tokenUSD > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: "var(--neon-blue)" }}>
              {chainMeta.nativeCurrencyLabel} {formatUSD(tokenUSD)}
            </span>
            {usdChange24h !== null && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  color:      usdChange24h >= 0 ? "var(--neon-green)" : "#ff4d4d",
                  background: usdChange24h >= 0 ? "var(--bg-input-g)" : "rgba(255,77,77,0.08)",
                  border:     `1px solid ${usdChange24h >= 0 ? "var(--border-g1)" : "rgba(255,77,77,0.2)"}`,
                }}
              >
                {usdChange24h >= 0 ? "▲" : "▼"} {Math.abs(usdChange24h).toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Mobile chain badge */}
        <div className="lg:hidden">
          <ChainSwitcher compact dropdownAlign="left" />
        </div>
      </div>

      {/* Center: logo — absolutely centered so left/right content doesn't push it */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none">
        <div className="w-8 h-8 rounded-xl overflow-hidden" style={{ boxShadow: "0 0 12px rgba(255,255,255,0.15)" }}>
          <Image src="/logo.png" alt="Sysfi" width={32} height={32} className="object-contain" priority />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {isUnsupportedChain && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{
              background: "rgba(255,45,120,0.1)",
              border:     "1px solid rgba(255,45,120,0.3)",
              color:      "#ff2d78",
            }}
          >
            <AlertTriangle size={12} />
            <span className="hidden sm:block">Unsupported network</span>
          </div>
        )}

        {isConnected && !isUnsupportedChain && (
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "var(--bg-input)",
              border:     "1px solid var(--border-1)",
            }}
          >
            <span className="text-xs font-mono text-text-secondary">
              {balanceFormatted} {chainMeta.nativeCurrencyLabel}
            </span>
            {tokenUSD > 0 && (
              <span className="text-xs font-mono text-text-muted">
                ({formatUSD(parseFloat(balanceFormatted) * tokenUSD)})
              </span>
            )}
          </div>
        )}

        {/* Desktop chain switcher */}
        <div className="hidden lg:block">
          <ChainSwitcher compact />
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{
            background: "var(--bg-input)",
            border:     "1px solid var(--border-1)",
            color:      "var(--c-text-2)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-3)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--neon-blue)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-1)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--c-text-2)";
          }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* RainbowKit wallet button */}
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready     = mounted;
            const connected = ready && account && chain;
            return (
              <div {...(!ready && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" } })}>
                {!connected ? (
                  <button
                    onClick={openConnectModal}
                    className="btn-neon-blue px-4 py-1.5 rounded-xl text-sm font-mono font-bold tracking-wide"
                  >
                    Connect
                  </button>
                ) : chain.unsupported ? (
                  <button
                    onClick={openChainModal}
                    className="px-4 py-1.5 rounded-xl text-sm font-mono"
                    style={{
                      background: "rgba(255,45,120,0.1)",
                      border:     "1px solid rgba(255,45,120,0.3)",
                      color:      "#ff2d78",
                    }}
                  >
                    Wrong Network
                  </button>
                ) : (
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: "var(--bg-input-g)",
                      border:     "1px solid var(--border-g2)",
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }}
                    />
                    <span className="text-xs font-mono" style={{ color: "var(--neon-green)" }}>
                      {shortAddress(account.address)}
                    </span>
                  </button>
                )}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
