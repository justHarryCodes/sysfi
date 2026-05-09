"use client";

import { useParams }  from "next/navigation";
import { ExternalLink, Copy, ArrowLeft, Loader2, Twitter, Send, Share2, Check } from "lucide-react";
import Link           from "next/link";
import { toast }      from "react-hot-toast";
import { useChainId } from "wagmi";
import { useState }   from "react";

import TradePanel          from "@/components/token/TradePanel";
import GraduationProgress  from "@/components/token/GraduationProgress";
import PriceChart          from "@/components/token/PriceChart";
import GlassCard           from "@/components/ui/GlassCard";
import { usePoolInfo }     from "@/hooks/useLaunchPool";
import { useETHUSD }       from "@/hooks/useETHPrice";
import { useTokenMetadata, imageUrl } from "@/hooks/useTokenMetadata";
import { getChainMeta, getExplorerAddressUrl } from "@/lib/chains";
import { formatETH, formatPrice, formatUSD, weiToUSD, shortAddress } from "@/lib/utils";
import { useReadContract }  from "wagmi";
import { ERC20_ABI }        from "@/lib/contracts";

function calcFDV(priceWei: bigint, ethUSD: number): string {
  return formatUSD((Number(priceWei) / 1e18) * 1_000_000_000 * ethUSD);
}

// ─── Share bar ────────────────────────────────────────────────────────────────
function ShareBar({
  name,
  symbol,
  priceUSD,
  fdv,
}: {
  name:     string;
  symbol:   string;
  priceUSD: number;
  fdv:      string;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const shareText =
    `🚀 ${name} ($${symbol}) is live on Sysfi!\n` +
    `💰 Price: ${formatUSD(priceUSD)}\n` +
    `📊 FDV: ${fdv}\n` +
    `🔗 Trade now:`;

  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  // Native share (mobile)
  async function nativeShare() {
    if (!navigator.share) { copyLink(); return; }
    try {
      await navigator.share({ title: `${name} ($${symbol}) on Sysfi`, text: shareText, url });
    } catch { /* user dismissed */ }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider mr-1">
        Share:
      </span>

      {/* Twitter / X */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105"
        style={{
          background: "rgba(0,0,0,0.4)",
          border:     "1px solid rgba(255,255,255,0.1)",
          color:      "#e2e8f0",
        }}
        title="Share on X / Twitter"
      >
        <Twitter size={12} />
        <span className="hidden sm:block">Twitter</span>
      </a>

      {/* Telegram */}
      <a
        href={telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105"
        style={{
          background: "rgba(0,136,204,0.12)",
          border:     "1px solid rgba(0,136,204,0.3)",
          color:      "#29a9e0",
        }}
        title="Share on Telegram"
      >
        <Send size={12} />
        <span className="hidden sm:block">Telegram</span>
      </a>

      {/* Copy link */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105"
        style={{
          background: copied ? "rgba(0,255,135,0.12)" : "rgba(0,212,255,0.08)",
          border:     copied ? "1px solid rgba(0,255,135,0.3)" : "1px solid rgba(0,212,255,0.2)",
          color:      copied ? "var(--neon-green)" : "var(--neon-blue)",
        }}
        title="Copy link"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        <span className="hidden sm:block">{copied ? "Copied!" : "Copy link"}</span>
      </button>

      {/* Native share (shows on mobile) */}
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button
          onClick={nativeShare}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all hover:scale-105 sm:hidden"
          style={{
            background: "rgba(0,212,255,0.08)",
            border:     "1px solid rgba(0,212,255,0.2)",
            color:      "var(--neon-blue)",
          }}
        >
          <Share2 size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TokenPageClient() {
  const { address: poolAddr } = useParams<{ address: `0x${string}` }>();
  const chainId   = useChainId();
  const ethUSD    = useETHUSD();
  const chainMeta = getChainMeta(chainId);

  const { data: pool, isLoading } = usePoolInfo(poolAddr as `0x${string}`);
  const { meta } = useTokenMetadata(poolAddr);

  const [,, poolETH, feesETH, lockedTokens, lockTime, priceWei, initialized, graduated] = pool ?? [];

  const { data: tokenAddr } = useReadContract({
    address: poolAddr as `0x${string}`,
    abi: [{ name: "token", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }],
    functionName: "token",
    query: { enabled: !!poolAddr },
  });

  const { data: creatorAddr } = useReadContract({
    address: poolAddr as `0x${string}`,
    abi: [{ name: "creator", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }],
    functionName: "creator",
    query: { enabled: !!poolAddr },
  });

  const { data: onchainName }   = useReadContract({ address: tokenAddr as `0x${string}`, abi: ERC20_ABI, functionName: "name",   query: { enabled: !!tokenAddr } });
  const { data: onchainSymbol } = useReadContract({ address: tokenAddr as `0x${string}`, abi: ERC20_ABI, functionName: "symbol", query: { enabled: !!tokenAddr } });

  const displayName   = meta?.name   || (onchainName   as string) || "Loading…";
  const displaySymbol = meta?.symbol || (onchainSymbol as string) || "—";

  function copyAddr(addr: string) { navigator.clipboard.writeText(addr); toast.success("Copied!"); }

  const priceUSD  = priceWei != null && ethUSD ? weiToUSD(priceWei, ethUSD) : 0;
  const raisedUSD = poolETH  != null && ethUSD ? weiToUSD(poolETH,  ethUSD) : 0;
  const fdv       = priceWei != null && ethUSD ? calcFDV(priceWei, ethUSD)  : "";
  const native    = chainMeta.nativeCurrencyLabel;

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={32} className="animate-spin" style={{ color: "var(--neon-blue)" }} />
    </div>
  );

  if (!initialized) return (
    <GlassCard className="p-12 text-center">
      <p className="text-text-secondary font-mono">Pool not found.</p>
      <Link href="/" className="inline-block mt-4 text-neon-blue font-mono text-sm hover:underline">← Back</Link>
    </GlassCard>
  );

  return (
    <div className="animate-fade-in space-y-5">
      <Link href="/" prefetch className="inline-flex items-center gap-1.5 text-sm font-mono text-text-secondary hover:text-neon-blue transition-colors">
        <ArrowLeft size={14} /> All tokens
      </Link>

      {/* Banner */}
      <div className="w-full rounded-2xl overflow-hidden relative" style={{ height: "160px" }}>
        {meta?.hasBanner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(poolAddr, chainId, "banner")} alt="banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${chainMeta.bgColor} 0%, rgba(0,255,135,0.06) 50%, ${chainMeta.bgColor} 100%)` }}>
            <div className="w-full h-full opacity-20"
              style={{ backgroundImage: "linear-gradient(rgba(0,212,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.2) 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          </div>
        )}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent via-transparent to-[rgba(6,6,17,0.9)]" />
        {graduated && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-xl text-xs font-mono font-bold backdrop-blur"
            style={{ background: "rgba(0,255,135,0.15)", border: "1px solid rgba(0,255,135,0.35)", color: "var(--neon-green)" }}>
            🎓 Graduated to Uniswap V3
          </div>
        )}
      </div>

      {/* Token header */}
      <GlassCard glow="blue" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

          {/* Left: logo + name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2"
              style={{ borderColor: graduated ? "rgba(0,255,135,0.4)" : "rgba(0,212,255,0.3)" }}>
              {meta?.hasLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl(poolAddr, chainId, "logo")} alt={displaySymbol} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-display font-bold text-2xl"
                  style={{ background: chainMeta.bgColor, color: chainMeta.color }}>
                  {displaySymbol.slice(0, 2)}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl font-display font-bold text-text-primary">{displayName}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="font-mono text-sm text-text-secondary">${displaySymbol}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md"
                  style={{ background: chainMeta.bgColor, color: chainMeta.color, border: `1px solid ${chainMeta.color}30` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={chainMeta.iconSrc} alt={chainMeta.chain.name} width={12} height={12}
                    className="rounded-full object-contain"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  {chainMeta.chain.name}
                </span>
              </div>
              {meta?.description && (
                <p className="text-sm text-text-secondary font-body mt-2 leading-relaxed max-w-md">
                  {meta.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: share bar */}
          <div className="shrink-0">
            <ShareBar
              name={displayName}
              symbol={displaySymbol}
              priceUSD={priceUSD}
              fdv={fdv}
            />
          </div>
        </div>

        {/* Addresses */}
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { label: "Token",   addr: tokenAddr   as string },
            { label: "Pool",    addr: poolAddr },
            { label: "Creator", addr: creatorAddr  as string },
          ] as const).map(({ label, addr }) => addr && (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/30 border border-white/5">
              <span className="text-[10px] font-mono text-text-muted">{label}:</span>
              <span className="text-[11px] font-mono text-text-secondary">{shortAddress(addr)}</span>
              <button onClick={() => copyAddr(addr)} className="text-text-muted hover:text-neon-blue transition-colors"><Copy size={10} /></button>
              <a href={getExplorerAddressUrl(chainId, addr)} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-neon-blue transition-colors">
                <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Charts + Trade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Price",   primary: priceWei != null ? `${formatPrice(priceWei)} ${native}` : "—", secondary: priceUSD > 0 ? formatUSD(priceUSD) : null },
              { label: "FDV",     primary: fdv || "—",                                                      secondary: "1B tokens", highlight: true },
              { label: "Raised",  primary: poolETH  != null ? `${formatETH(poolETH)}  ${native}` : "—",    secondary: raisedUSD > 0 ? formatUSD(raisedUSD) : null },
              { label: "Fees",    primary: feesETH  != null ? `${formatETH(feesETH)}  ${native}` : "—",    secondary: null },
            ].map(({ label, primary, secondary, highlight }) => (
              <GlassCard key={label} glow={highlight ? "green" : "none"} className="p-3">
                <p className="text-[10px] font-mono text-text-muted mb-0.5">{label}</p>
                <p className="text-xs font-mono font-bold text-text-primary">{primary}</p>
                {secondary && <p className="text-[10px] mt-0.5" style={{ color: "var(--neon-blue)" }}>{secondary}</p>}
              </GlassCard>
            ))}
          </div>

          <PriceChart poolAddr={initialized ? (poolAddr as `0x${string}`) : undefined} currentPriceWei={priceWei ?? 0n} />

          {poolETH != null && (
            <GraduationProgress poolETH={poolETH} graduated={!!graduated} ethUSD={ethUSD} nativeCurrencyLabel={native} />
          )}
        </div>

        <div className="space-y-4">
          {priceWei != null && tokenAddr && (
            <TradePanel
              poolAddr={poolAddr as `0x${string}`}
              tokenAddr={tokenAddr as `0x${string}`}
              graduated={!!graduated}
              priceWei={priceWei}
              ethUSD={ethUSD}
              nativeCurrencyLabel={native}
            />
          )}
        </div>
      </div>
    </div>
  );
}