"use client";

import Link from "next/link";
import { Wallet, Loader2, ExternalLink } from "lucide-react";
import { toast } from "react-hot-toast";

import GlassCard from "@/components/ui/GlassCard";
import NeonButton from "@/components/ui/NeonButton";
import { useWallet } from "@/context/WalletContext";
import { useETHUSD } from "@/hooks/useETHPrice";
import { useTotalTokens, useTokensPaginated } from "@/hooks/useTokenFactory";
import {
  usePoolInfo,
  useTokenBalance,
  useClaimFees,
  useClaimLocked,
} from "@/hooks/useLaunchPool";
import { useTokenMetadata, imageUrl } from "@/hooks/useTokenMetadata";
import {
  formatETH,
  formatTokenAmount,
  formatUSD,
  weiToUSD,
  shortAddress,
  countdown,
} from "@/lib/utils";
import { useReadContract, useChainId } from "wagmi";
import { ERC20_ABI } from "@/lib/contracts";
import type { TokenInfo } from "@/hooks/useTokenFactory";

function PortfolioRow({ info, ethUSD }: { info: TokenInfo; ethUSD: number }) {
  const { address } = useWallet();
  const chainId = useChainId();
  const { data: pool } = usePoolInfo(info.pool as `0x${string}`);
  const { meta } = useTokenMetadata(info.pool);
  const { data: tokenSymbol } = useReadContract({
    address: info.token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
  });
  const { data: tokenName } = useReadContract({
    address: info.token as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "name",
  });
  const { data: tokenBal } = useTokenBalance(
    info.token as `0x${string}`,
    address,
  );
  const { claimFees, isPending: cfPending } = useClaimFees(
    info.pool as `0x${string}`,
  );
  const { claimLocked, isPending: clPending } = useClaimLocked(
    info.pool as `0x${string}`,
  );

  const [, , , feesETH, lockedTokens, lockTime, priceWei, , graduated] =
    pool ?? [];

  const isCreator = address?.toLowerCase() === info.creator.toLowerCase();
  const hasHolding = (tokenBal ?? 0n) > 0n;
  const hasFees = (feesETH ?? 0n) > 0n;
  const canUnlock =
    lockedTokens &&
    lockedTokens > 0n &&
    lockTime &&
    BigInt(Math.floor(Date.now() / 1000)) >= lockTime;

  if (!isCreator && !hasHolding) return null;

  const holdingUSD =
    tokenBal && priceWei && ethUSD
      ? weiToUSD((tokenBal * priceWei) / BigInt(1e18), ethUSD)
      : 0;
  const feesUSD = feesETH && ethUSD ? weiToUSD(feesETH, ethUSD) : 0;

  const displaySymbol = (tokenSymbol as string) ?? "??";

  return (
    <GlassCard glow={graduated ? "green" : "none"} className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border"
            style={{ borderColor: "rgba(0,212,255,0.2)" }}
          >
            {meta?.hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(info.pool, chainId, "logo")}
                alt={displaySymbol}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-mono font-bold text-sm"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,255,135,0.15))",
                  color: "var(--neon-blue)",
                }}
              >
                {displaySymbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-mono font-bold text-text-primary">
              {(tokenName as string) ?? shortAddress(info.token)}
            </p>
            <p className="text-xs text-text-muted font-mono">
              ${displaySymbol}
            </p>
          </div>
        </div>

        {/* Balances + actions */}
        <div className="flex flex-wrap items-center gap-2">
          {hasHolding && (
            <div
              className="px-3 py-1.5 rounded-lg text-xs font-mono space-y-0.5"
              style={{
                background: "rgba(0,212,255,0.06)",
                border: "1px solid rgba(0,212,255,0.12)",
              }}
            >
              <p>
                <span className="text-text-muted">Hold: </span>
                <span className="text-neon-blue font-bold">
                  {formatTokenAmount(tokenBal!)}
                </span>
              </p>
              {holdingUSD > 0 && (
                <p className="text-text-muted">≈ {formatUSD(holdingUSD)}</p>
              )}
            </div>
          )}

          {isCreator && hasFees && (
            <NeonButton
              variant="green"
              size="sm"
              loading={cfPending}
              onClick={() => {
                claimFees();
                toast.success("Claiming fees…");
              }}
            >
              Claim {formatETH(feesETH!)} ETH
              {feesUSD > 0 && (
                <span className="ml-1 opacity-70">({formatUSD(feesUSD)})</span>
              )}
            </NeonButton>
          )}

          {isCreator && canUnlock && (
            <NeonButton
              variant="blue"
              size="sm"
              loading={clPending}
              onClick={() => {
                claimLocked();
                toast.success("Claiming locked tokens…");
              }}
            >
              Unlock {formatTokenAmount(lockedTokens!)}
            </NeonButton>
          )}

          {isCreator &&
            lockedTokens &&
            lockedTokens > 0n &&
            !canUnlock &&
            lockTime && (
              <div
                className="px-3 py-1.5 rounded-lg text-xs font-mono"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#64748b",
                }}
              >
                🔒 {countdown(lockTime)}
              </div>
            )}

          <Link href={`/token/${info.pool}`} prefetch>
            <NeonButton
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <ExternalLink size={11} /> Trade
            </NeonButton>
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

export default function PortfolioPage() {
  const { isConnected, address } = useWallet();
  const chainId = useChainId();
  const ethUSD = useETHUSD(chainId);
  const { data: total } = useTotalTokens();
  const totalN = Number(total ?? 0n);
  const { data: tokens, isLoading } = useTokensPaginated(
    Math.max(0, totalN - 50),
    Math.min(50, totalN),
  );

  if (!isConnected)
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Wallet size={40} className="text-neon-blue mb-4 animate-float" />
        <h2 className="text-xl font-display font-bold text-text-primary mb-2">
          Connect your wallet
        </h2>
        <p className="text-sm text-text-secondary font-body max-w-xs">
          See your token holdings, claimable fees, and locked allocations.
        </p>
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1
          className="text-2xl lg:text-3xl font-display font-bold"
          style={{
            background:
              "linear-gradient(90deg, var(--neon-blue), var(--neon-green))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Portfolio
        </h1>
        <p className="text-sm text-text-secondary font-body mt-1">
          {shortAddress(address!)}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={28}
            className="animate-spin"
            style={{ color: "var(--neon-blue)" }}
          />
        </div>
      ) : !tokens || (tokens as TokenInfo[]).length === 0 ? (
        <GlassCard className="p-12 text-center">
          <p className="text-text-secondary font-mono text-sm">
            No activity found.
          </p>
          <Link href="/" prefetch className="inline-block mt-4">
            <NeonButton variant="blue" size="sm">
              Explore Tokens
            </NeonButton>
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {[...(tokens as TokenInfo[])].reverse().map((info) => (
            <PortfolioRow key={info.pool} info={info} ethUSD={ethUSD} />
          ))}
        </div>
      )}
    </div>
  );
}
