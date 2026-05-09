"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/context/WalletContext";
import { useETHPrice } from "@/hooks/useETHPrice";
import ChainSwitcher from "./ChainSwitcher";
import { shortAddress, formatUSD } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export default function TopBar() {
  const {
    chainId,
    isConnected,
    isUnsupportedChain,
    balanceFormatted,
    chainMeta,
  } = useWallet();
  const {
    usd: tokenUSD,
    usdChange24h,
    loading: priceLoading,
  } = useETHPrice(chainId);

  return (
    <header
      className="fixed top-8 left-0 right-0 lg:left-56 z-30 h-14 flex items-center justify-between px-4 lg:px-6"
      style={{
        background: "rgba(6,6,17,0.9)",
        borderBottom: "1px solid rgba(0,212,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Left: live price pill */}
      <div className="flex items-center gap-3">
        <div
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{
            background: priceLoading ? "var(--neon-blue)" : "var(--neon-green)",
            boxShadow: `0 0 6px ${priceLoading ? "var(--neon-blue)" : "var(--neon-green)"}`,
          }}
        />

        {!priceLoading && tokenUSD > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span
              className="text-xs font-mono"
              style={{ color: "var(--neon-blue)" }}
            >
              {chainMeta.nativeCurrencyLabel} {formatUSD(tokenUSD)}
            </span>
            {usdChange24h !== null && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{
                  color: usdChange24h >= 0 ? "var(--neon-green)" : "#ff4d4d",
                  background:
                    usdChange24h >= 0
                      ? "rgba(0,255,135,0.08)"
                      : "rgba(255,77,77,0.08)",
                  border: `1px solid ${usdChange24h >= 0 ? "rgba(0,255,135,0.2)" : "rgba(255,77,77,0.2)"}`,
                }}
              >
                {usdChange24h >= 0 ? "▲" : "▼"}{" "}
                {Math.abs(usdChange24h).toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Mobile chain badge */}
        <div className="lg:hidden">
          <ChainSwitcher compact />
        </div>
      </div>

      {/* Right: balance + chain + wallet */}
      <div className="flex items-center gap-2">
        {/* Unsupported chain warning */}
        {isUnsupportedChain && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
            style={{
              background: "rgba(255,45,120,0.1)",
              border: "1px solid rgba(255,45,120,0.3)",
              color: "#ff2d78",
            }}
          >
            <AlertTriangle size={12} />
            <span className="hidden sm:block">Unsupported network</span>
          </div>
        )}

        {/* Balance */}
        {isConnected && !isUnsupportedChain && (
          <div
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.12)",
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

        {/* RainbowKit button */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            mounted,
          }) => {
            const ready = mounted;
            const connected = ready && account && chain;
            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: { opacity: 0, pointerEvents: "none" },
                })}
              >
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
                      border: "1px solid rgba(255,45,120,0.3)",
                      color: "#ff2d78",
                    }}
                  >
                    Wrong Network
                  </button>
                ) : (
                  <button
                    onClick={openAccountModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-[1.02]"
                    style={{
                      background: "rgba(0,255,135,0.06)",
                      border: "1px solid rgba(0,255,135,0.2)",
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: "var(--neon-green)",
                        boxShadow: "0 0 6px var(--neon-green)",
                      }}
                    />
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--neon-green)" }}
                    >
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
