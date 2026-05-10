"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Globe,
  Twitter,
  Send,
  MessageSquare,
  Users,
  Zap,
  TrendingUp,
} from "lucide-react";
import { usePoolInfo } from "@/hooks/useLaunchPool";
import { useETHUSD } from "@/hooks/useETHPrice";
import { imageUrl } from "@/hooks/useTokenMetadata";
import { getChainMeta } from "@/lib/chains";
import {
  formatETH,
  formatPrice,
  formatUSD,
  weiToUSD,
  graduationPercent,
  shortAddress,
  timeAgo,
} from "@/lib/utils";
import type { TokenInfo } from "@/hooks/useTokenFactory";
import { useReadContract, useChainId } from "wagmi";
import { ERC20_ABI } from "@/lib/contracts";

/** FDV = price per token × total fixed supply (1 billion) */
function calcFDV(priceWei: bigint, ethUSD: number): string {
  if (!ethUSD || !priceWei) return "";
  const priceETH = Number(priceWei) / 1e18;
  const fdvUSD = priceETH * 1_000_000_000 * ethUSD;
  return formatUSD(fdvUSD);
}

interface Props {
  info: TokenInfo;
  meta?: {
    name?: string;
    symbol?: string;
    description?: string;
    hasLogo?: boolean;
    hasBanner?: boolean;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  } | null;
}

export default function TokenCard({ info, meta }: Props) {
  const chainId = useChainId();
  const chainMeta = getChainMeta(chainId);
  const ethUSD = useETHUSD(chainId);

  const { data: pool } = usePoolInfo(info.pool as `0x${string}`);

  const { data: onchainName } = useReadContract({
    address: info.token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "name",
  });

  const { data: onchainSymbol } = useReadContract({
    address: info.token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });

  const [, , poolETH, , , , priceWei, , graduated, canGraduate] = pool ?? [];

  const displayName =
    meta?.name || (onchainName as string) || shortAddress(info.token);

  const displaySymbol = meta?.symbol || (onchainSymbol as string) || "???";

  const hasBanner = !!meta?.hasBanner;
  const hasLogo = !!meta?.hasLogo;

  const progress = poolETH != null ? graduationPercent(poolETH) : 0;
  const priceUSD = priceWei != null && ethUSD ? weiToUSD(priceWei, ethUSD) : 0;

  const raisedETH = poolETH != null ? formatETH(poolETH) : "—";

  const raisedUSD =
    poolETH != null && ethUSD ? formatUSD(weiToUSD(poolETH, ethUSD)) : "";

  const fdv = priceWei != null ? calcFDV(priceWei, ethUSD) : "";

  const socials = [
    meta?.website && {
      href: meta.website,
      icon: Globe,
      label: "Website",
    },
    meta?.twitter && {
      href: meta.twitter,
      icon: Twitter,
      label: "Twitter",
    },
    meta?.telegram && {
      href: meta.telegram,
      icon: Send,
      label: "Telegram",
    },
    meta?.discord && {
      href: meta.discord,
      icon: MessageSquare,
      label: "Discord",
    },
  ].filter(Boolean) as {
    href: string;
    icon: React.ElementType;
    label: string;
  }[];

  return (
    <Link href={`/token/${info.pool}`} prefetch>
      <article
        className="group rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5"
        style={{
          background: "rgba(10,10,26,0.9)",
          border: graduated
            ? "1px solid rgba(0,255,135,0.25)"
            : "1px solid rgba(0,212,255,0.1)",
          boxShadow: graduated
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 30px rgba(0,255,135,0.06)"
            : "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Banner */}
        <div className="relative w-full" style={{ height: "120px" }}>
          {hasBanner ? (
            <img
              src={imageUrl(info.pool, chainId, "banner")}
              alt="banner"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg,
                  ${chainMeta.bgColor} 0%,
                  rgba(0,255,135,0.06) 40%,
                  ${chainMeta.bgColor} 100%)`,
              }}
            >
              <div
                className="w-full h-full opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(0,212,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.15) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />
            </div>
          )}

          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, transparent 45%, rgba(10,10,26,0.98) 100%)",
            }}
          />

          {/* Chain badge */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono backdrop-blur-sm"
            style={{
              background: "rgba(6,6,17,0.75)",
              border: `1px solid ${chainMeta.color}30`,
              color: chainMeta.color,
            }}
          >
            <Image
              src={chainMeta.iconSrc}
              alt={chainMeta.chain.name}
              width={12}
              height={12}
              className="rounded-full object-contain"
            />
            {chainMeta.chain.name.split(" ")[0]}
          </div>

          {/* Graduated badge */}
          {graduated && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold backdrop-blur-sm"
              style={{
                background: "rgba(0,255,135,0.15)",
                border: "1px solid rgba(0,255,135,0.35)",
                color: "var(--neon-green)",
              }}
            >
              🎓 Graduated
            </div>
          )}

          {!graduated && canGraduate && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold backdrop-blur-sm animate-pulse"
              style={{
                background: "rgba(0,212,255,0.15)",
                border: "1px solid rgba(0,212,255,0.35)",
                color: "var(--neon-blue)",
              }}
            >
              ⚡ Ready
            </div>
          )}

          {/* Logo */}
          <div className="absolute -bottom-5 left-4">
            <div
              className="w-12 h-12 rounded-xl overflow-hidden border-2"
              style={{
                borderColor: graduated
                  ? "rgba(0,255,135,0.4)"
                  : "rgba(0,212,255,0.3)",
                background: "rgba(10,10,26,0.95)",
              }}
            >
              {hasLogo ? (
                <img
                  src={imageUrl(info.pool, chainId, "logo")}
                  alt={displaySymbol}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-display font-bold text-sm"
                  style={{
                    background: chainMeta.bgColor,
                    color: chainMeta.color,
                  }}
                >
                  {displaySymbol.slice(0, 2)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-7 pb-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-text-primary truncate group-hover:text-neon-blue transition-colors">
                {displayName}
              </p>
              <p className="text-xs font-mono text-text-secondary">
                ${displaySymbol}
              </p>
            </div>

            {socials.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {socials.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-text-muted hover:text-neon-blue transition-colors"
                    title={label}
                  >
                    <Icon size={12} />
                  </a>
                ))}
              </div>
            )}
          </div>

          {meta?.description && (
            <p className="text-[11px] text-text-secondary font-body leading-relaxed mt-1.5 mb-3 line-clamp-2">
              {meta.description}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3 mb-3">
            <div
              className="rounded-xl p-2.5"
              style={{
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.08)",
              }}
            >
              <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-0.5">
                Price
              </p>
              <p className="text-[11px] font-mono font-bold text-text-primary leading-tight">
                {priceWei != null ? formatPrice(priceWei) : "—"}
                <span className="text-text-muted font-normal text-[9px] ml-0.5">
                  {chainMeta.nativeCurrencyLabel}
                </span>
              </p>

              {priceUSD > 0 && (
                <p
                  className="text-[10px] font-mono mt-0.5"
                  style={{ color: "var(--neon-blue)" }}
                >
                  {formatUSD(priceUSD)}
                </p>
              )}
            </div>

            <div
              className="rounded-xl p-2.5"
              style={{
                background: "rgba(0,255,135,0.04)",
                border: "1px solid rgba(0,255,135,0.08)",
              }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp size={8} style={{ color: "var(--neon-green)" }} />
                <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
                  FDV
                </p>
              </div>

              <p
                className="text-[11px] font-mono font-bold"
                style={{
                  color: fdv ? "var(--neon-green)" : "#475569",
                }}
              >
                {fdv || "—"}
              </p>

              <p className="text-[9px] font-mono text-text-muted mt-0.5">
                1B supply
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono mb-3">
            <span className="text-text-muted">Raised</span>
            <span className="text-text-primary">
              {raisedETH} {chainMeta.nativeCurrencyLabel}
              {raisedUSD && (
                <span className="text-text-secondary ml-1">({raisedUSD})</span>
              )}
            </span>
          </div>

          {!graduated && (
            <div>
              <div className="flex justify-between text-[9px] font-mono text-text-muted mb-1.5">
                <span className="flex items-center gap-1">
                  <Zap size={8} style={{ color: "var(--neon-blue)" }} />
                  Graduation
                </span>
                <span>
                  {progress.toFixed(1)}% / 10 {chainMeta.nativeCurrencyLabel}
                </span>
              </div>

              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progress}%`,
                    background:
                      "linear-gradient(90deg, var(--neon-blue), var(--neon-green))",
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] font-mono text-text-muted">
              <Users size={8} />
              <span>{shortAddress(info.creator)}</span>
            </div>

            <span className="text-[9px] font-mono text-text-muted">
              {timeAgo(Number(info.createdAt))}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
