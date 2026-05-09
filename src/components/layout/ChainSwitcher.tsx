"use client";

import Image from "next/image";
import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { getChainMeta, SUPPORTED_CHAIN_IDS } from "@/lib/chains";
import { ChevronDown, Check, AlertTriangle } from "lucide-react";

interface ChainSwitcherProps {
  compact?: boolean;
}

export default function ChainSwitcher({ compact = false }: ChainSwitcherProps) {
  const { chainId, chainMeta, isConnected, isUnsupportedChain, switchChain } =
    useWallet();

  const [open, setOpen] = useState(false);

  const current = isUnsupportedChain
    ? {
        iconSrc: "",
        chain: { name: "Unsupported" },
        color: "#ff2d78",
        bgColor: "rgba(255,45,120,0.1)",
        isTestnet: false,
      }
    : chainMeta;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all hover:scale-[1.02]"
        style={{
          background: current.bgColor,
          border: `1px solid ${current.color}40`,
          color: current.color,
        }}
      >
        {isUnsupportedChain ? (
          <AlertTriangle size={14} />
        ) : (
          <Image
            src={current.iconSrc}
            alt={current.chain.name}
            width={14}
            height={14}
            className="rounded-full object-contain"
          />
        )}

        {!compact && (
          <span className="hidden sm:block max-w-[90px] truncate">
            {current.chain.name}
          </span>
        )}

        <ChevronDown
          size={11}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div
            className="absolute top-full mt-2 right-0 z-50 w-56 rounded-xl overflow-hidden"
            style={{
              background: "rgba(13,13,31,0.98)",
              border: "1px solid rgba(0,212,255,0.15)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            }}
          >
            {/* Testnets */}
            <div
              className="px-3 py-2 border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                Testnets
              </p>
            </div>

            {SUPPORTED_CHAIN_IDS.filter((id) => getChainMeta(id).isTestnet).map(
              (id) => (
                <ChainRow
                  key={id}
                  id={id}
                  activeId={chainId}
                  isConnected={isConnected}
                  onSelect={(id) => {
                    switchChain(id);
                    setOpen(false);
                  }}
                />
              ),
            )}

            {/* Mainnets */}
            <div
              className="px-3 py-2 border-t border-b"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                Mainnets
              </p>
            </div>

            {SUPPORTED_CHAIN_IDS.filter(
              (id) => !getChainMeta(id).isTestnet,
            ).map((id) => (
              <ChainRow
                key={id}
                id={id}
                activeId={chainId}
                isConnected={isConnected}
                onSelect={(id) => {
                  switchChain(id);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ChainRow({
  id,
  activeId,
  isConnected,
  onSelect,
}: {
  id: number;
  activeId: number;
  isConnected: boolean;
  onSelect: (id: number) => void;
}) {
  const meta = getChainMeta(id);
  const isActive = id === activeId;

  return (
    <button
      onClick={() => isConnected && onSelect(id)}
      disabled={!isConnected}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all disabled:opacity-40"
      style={{
        background: isActive ? meta.bgColor : "transparent",
        cursor: isConnected ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (!isActive && isConnected) {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.03)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isActive
          ? meta.bgColor
          : "transparent";
      }}
    >
      <Image
        src={meta.iconSrc}
        alt={meta.chain.name}
        width={18}
        height={18}
        className="rounded-full object-contain flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-medium text-text-primary truncate">
          {meta.chain.name}
        </p>
        <p className="text-[10px] font-mono text-text-muted">
          {meta.nativeCurrencyLabel}
        </p>
      </div>

      {isActive && (
        <Check size={12} style={{ color: meta.color, flexShrink: 0 }} />
      )}
    </button>
  );
}
