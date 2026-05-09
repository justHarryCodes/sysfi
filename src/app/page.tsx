"use client";

import { useState, useMemo, useEffect, memo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Rocket,
  Search,
  Loader2,
  DollarSign,
  LayoutGrid,
  List,
  Zap,
  RefreshCw,
  Database,
  Activity,
} from "lucide-react";

import TokenCard from "@/components/token/TokenCard";
import GlassCard from "@/components/ui/GlassCard";
import NeonButton from "@/components/ui/NeonButton";
import { useETHPrice } from "@/hooks/useETHPrice";
import {
  useTokens,
  useTokensBlockchain,
  pgRowToTokenInfo,
  type PGTokenRow,
} from "@/hooks/useTokens";
import { useBulkMetadata, imageUrl } from "@/hooks/useTokenMetadata";
import { formatUSD, timeAgo } from "@/lib/utils";
import { useChainId } from "wagmi";
import { getChainMeta } from "@/lib/chains";
import type { TokenInfo } from "@/hooks/useTokenFactory";

const PAGE_SIZE = 12;
type ViewMode = "grid" | "list";

// ─── Skeleton card ────────────────────────────────────────────────────────────
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden animate-pulse"
      style={{
        background: "rgba(10,10,26,0.9)",
        border: "1px solid rgba(0,212,255,0.06)",
      }}
    >
      <div
        className="w-full h-[120px]"
        style={{ background: "rgba(0,212,255,0.04)" }}
      />
      <div className="p-4 pt-7 space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-28 rounded"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="h-3 w-12 rounded"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="h-12 rounded-xl"
            style={{ background: "rgba(0,212,255,0.04)" }}
          />
          <div
            className="h-12 rounded-xl"
            style={{ background: "rgba(0,255,135,0.04)" }}
          />
        </div>
        <div
          className="h-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.05)" }}
        />
      </div>
    </div>
  );
});

// ─── Memoised token card ──────────────────────────────────────────────────────
const MemoTokenCard = memo(function MemoTokenCard({
  info,
  meta,
}: {
  info: TokenInfo;
  meta: ReturnType<typeof useBulkMetadata>[string] | null;
}) {
  return <TokenCard info={info} meta={meta} />;
});

// ─── List row ─────────────────────────────────────────────────────────────────
const ListRow = memo(function ListRow({
  info,
  idx,
  chainId,
  meta,
}: {
  info: TokenInfo;
  idx: number;
  chainId: number;
  meta: ReturnType<typeof useBulkMetadata>[string] | null;
}) {
  const chainMeta = getChainMeta(chainId);

  return (
    <Link href={`/token/${info.pool}`} prefetch>
      <GlassCard hover className="p-4 flex items-center gap-4">
        <span className="text-xs font-mono text-text-muted w-6 shrink-0 text-right">
          {idx + 1}
        </span>

        {/* Token logo */}
        <div
          className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border"
          style={{ borderColor: "rgba(0,212,255,0.2)" }}
        >
          {meta?.hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl(info.pool, chainId, "logo")}
              alt=""
              width={36}
              height={36}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xs font-mono font-bold"
              style={{ background: chainMeta.bgColor, color: chainMeta.color }}
            >
              {(meta?.symbol || "??").slice(0, 2)}
            </div>
          )}
        </div>

        {/* Name + symbol */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-semibold text-text-primary truncate">
            {meta?.name || info.token.slice(0, 10) + "…"}
          </p>
          <p className="text-xs font-mono text-text-secondary">
            ${meta?.symbol || "—"}
          </p>
        </div>

        {/* Chain logo badge */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg shrink-0"
          style={{
            background: chainMeta.bgColor,
            border: `1px solid ${chainMeta.color}25`,
          }}
        >
          <Image
            src={chainMeta.iconSrc}
            alt={chainMeta.chain.name}
            width={14}
            height={14}
            className="object-contain"
          />
          <span
            className="text-[10px] font-mono"
            style={{ color: chainMeta.color }}
          >
            {chainMeta.chain.name.split(" ")[0]}
          </span>
        </div>
      </GlassCard>
    </Link>
  );
});

// ─── Token list ───────────────────────────────────────────────────────────────
const TokenList = memo(function TokenList({
  tokens,
  metaMap,
  chainId,
  isLoading,
  view,
}: {
  tokens: (PGTokenRow | TokenInfo)[];
  metaMap: ReturnType<typeof useBulkMetadata>;
  chainId: number;
  isLoading: boolean;
  view: ViewMode;
}) {
  if (isLoading) {
    return view === "grid" ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    ) : (
      <div className="space-y-2">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl animate-pulse"
            style={{
              background: "rgba(10,10,26,0.9)",
              border: "1px solid rgba(0,212,255,0.06)",
            }}
          />
        ))}
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <GlassCard className="p-16 text-center">
        <p className="text-5xl mb-4">🚀</p>
        <p className="text-base font-display font-semibold text-text-primary mb-2">
          No tokens yet
        </p>
        <p className="text-sm text-text-secondary font-body mb-6">
          Be the first to launch on this chain.
        </p>
        <Link href="/launch" prefetch>
          <NeonButton
            variant="solid-green"
            size="md"
            className="flex items-center gap-2 mx-auto"
          >
            <Rocket size={14} /> Launch First Token
          </NeonButton>
        </Link>
      </GlassCard>
    );
  }

  const infos: TokenInfo[] = tokens.map((t) =>
    "pool_address" in t ? pgRowToTokenInfo(t as PGTokenRow) : (t as TokenInfo),
  );

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {infos.map((info) => (
          <MemoTokenCard
            key={info.pool}
            info={info}
            meta={metaMap[info.pool.toLowerCase()] ?? null}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {infos.map((info, idx) => (
        <ListRow
          key={info.pool}
          info={info}
          idx={idx}
          chainId={chainId}
          meta={metaMap[info.pool.toLowerCase()] ?? null}
        />
      ))}
    </div>
  );
});

// ─── Main page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [view, setView] = useState<ViewMode>("grid");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const chainId = useChainId();
  const chainMeta = getChainMeta(chainId);
  const { usd: nativeUSD, loading: priceLoading } = useETHPrice();

  // Debounce search 300 ms
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const {
    tokens: pgTokens,
    tokenInfos,
    total: pgTotal,
    isLoading: pgLoading,
    source,
    syncedAt,
    refetch,
  } = useTokens({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  const useFallback = source === "blockchain";

  const {
    tokens: bcTokens,
    total: bcTotal,
    isLoading: bcLoading,
  } = useTokensBlockchain({ page, limit: PAGE_SIZE, enabled: useFallback });

  const tokens = useFallback ? bcTokens : tokenInfos;
  const total = useFallback ? bcTotal : pgTotal;
  const isLoading = useFallback ? bcLoading : pgLoading;

  const displayed = useMemo(() => {
    if (!useFallback || !debouncedSearch) return tokens;
    const q = debouncedSearch.toLowerCase();
    return (tokens as TokenInfo[]).filter(
      (t) =>
        t.token.toLowerCase().includes(q) || t.pool.toLowerCase().includes(q),
    );
  }, [tokens, useFallback, debouncedSearch]);

  const poolAddresses = useMemo(
    () =>
      displayed.map((t) =>
        "pool_address" in t
          ? (t as PGTokenRow).pool_address
          : (t as TokenInfo).pool,
      ),
    [displayed],
  );

  const metaMap = useBulkMetadata(poolAddresses);
  const pages = Math.ceil(total / PAGE_SIZE);

  // Silently prefetch adjacent pages
  const prefetchPage = useCallback(
    (p: number) => {
      if (p < 0 || p >= pages) return;
      const url = new URL("/api/tokens", window.location.origin);
      url.searchParams.set("chainId", String(chainId));
      url.searchParams.set("page", String(p));
      url.searchParams.set("limit", String(PAGE_SIZE));
      if (debouncedSearch) url.searchParams.set("search", debouncedSearch);
      fetch(url.toString()).catch(() => {});
    },
    [chainId, pages, debouncedSearch],
  );

  useEffect(() => {
    prefetchPage(page - 1);
    prefetchPage(page + 1);
  }, [page, prefetchPage]);

  const handleClearSearch = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setPage(0);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-2xl lg:text-3xl font-display font-bold"
              style={{
                background:
                  "linear-gradient(90deg, var(--neon-blue), var(--neon-green))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Explore Tokens
            </span>

            {/* Chain badge with logo */}
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-md inline-flex items-center gap-1.5"
              style={{
                background: chainMeta.bgColor,
                color: chainMeta.color,
                border: `1px solid ${chainMeta.color}30`,
              }}
            >
              <Image
                src={chainMeta.iconSrc}
                alt={chainMeta.chain.name}
                width={12}
                height={12}
                className="object-contain"
              />
              {chainMeta.chain.name}
            </span>

            {/* Data source badge */}
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1"
              style={
                source === "postgres"
                  ? {
                      background: "rgba(0,255,135,0.08)",
                      border: "1px solid rgba(0,255,135,0.2)",
                      color: "var(--neon-green)",
                    }
                  : source === "blockchain"
                    ? {
                        background: "rgba(0,212,255,0.08)",
                        border: "1px solid rgba(0,212,255,0.2)",
                        color: "var(--neon-blue)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "#475569",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
              }
            >
              {source === "postgres" ? (
                <>
                  <Database size={9} />
                  Off-Chain
                </>
              ) : source === "blockchain" ? (
                <>
                  <Activity size={9} />
                  On-Chain
                </>
              ) : (
                "…"
              )}
            </span>
          </div>

          <p className="text-sm text-text-secondary font-body">
            {total} token{total !== 1 ? "s" : ""}
            {syncedAt && (
              <span className="text-text-muted ml-2 text-xs">
                · synced {timeAgo(new Date(syncedAt).getTime() / 1000)}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="p-2 rounded-xl transition-all hover:scale-105"
            title="Refresh"
            style={{
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.12)",
              color: "var(--neon-blue)",
            }}
          >
            <RefreshCw size={14} />
          </button>
          <Link href="/launch" prefetch>
            <NeonButton
              variant="solid-green"
              size="md"
              className="flex items-center gap-2"
            >
              <Rocket size={14} /> Launch Token
            </NeonButton>
          </Link>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total launched */}
        <GlassCard glow="green" className="p-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(0,255,135,0.1)",
              border: "1px solid rgba(0,255,135,0.2)",
            }}
          >
            <Rocket size={15} style={{ color: "var(--neon-green)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-bold text-text-primary">
              {total}
            </p>
            <p className="text-[10px] text-text-secondary">Total Launched</p>
          </div>
        </GlassCard>

        {/* Native price */}
        <GlassCard glow="blue" className="p-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.2)",
            }}
          >
            {priceLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: "var(--neon-blue)" }}
              />
            ) : (
              <DollarSign size={15} style={{ color: "var(--neon-blue)" }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-bold text-text-primary">
              {priceLoading ? "—" : formatUSD(nativeUSD)}
            </p>
            <p className="text-[10px] text-text-secondary">
              {chainMeta.nativeCurrencyLabel} Price
            </p>
          </div>
        </GlassCard>

        {/* Data source */}
        <GlassCard glow="green" className="p-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: "rgba(0,255,135,0.1)",
              border: "1px solid rgba(0,255,135,0.2)",
            }}
          >
            <Database size={15} style={{ color: "var(--neon-green)" }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-bold text-text-primary truncate">
              {source === "postgres"
                ? "Database"
                : source === "blockchain"
                  ? "On-Chain"
                  : "—"}
            </p>
            <p className="text-[10px] text-text-secondary">Data Source</p>
          </div>
        </GlassCard>

        {/* Network — logo from chains.ts */}
        <GlassCard glow="blue" className="p-4 flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
            style={{
              background: chainMeta.bgColor,
              border: `1px solid ${chainMeta.color}30`,
            }}
          >
            <Image
              src={chainMeta.iconSrc}
              alt={chainMeta.chain.name}
              width={20}
              height={20}
              className="object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-bold text-text-primary truncate">
              {chainMeta.chain.name}
            </p>
            <p className="text-[10px] text-text-secondary">Network</p>
          </div>
        </GlassCard>
      </div>

      {/* ── Search + view toggle ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <GlassCard className="flex-1 p-3">
          <div className="flex items-center gap-3">
            <Search size={15} className="text-text-secondary shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, symbol, address…"
              className="flex-1 bg-transparent text-sm font-mono text-text-primary placeholder:text-text-muted outline-none"
            />
            {search && (
              <button
                onClick={handleClearSearch}
                className="text-xs font-mono text-text-muted hover:text-text-secondary shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </GlassCard>

        <div
          className="flex gap-1 p-1 rounded-xl shrink-0"
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid rgba(0,212,255,0.08)",
          }}
        >
          <button
            onClick={() => setView("grid")}
            className="p-2 rounded-lg transition-all"
            style={
              view === "grid"
                ? {
                    background: "rgba(0,212,255,0.15)",
                    color: "var(--neon-blue)",
                  }
                : { color: "#475569" }
            }
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView("list")}
            className="p-2 rounded-lg transition-all"
            style={
              view === "list"
                ? {
                    background: "rgba(0,212,255,0.15)",
                    color: "var(--neon-blue)",
                  }
                : { color: "#475569" }
            }
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* ── Token list ───────────────────────────────────────────────────── */}
      <TokenList
        tokens={displayed as (PGTokenRow | TokenInfo)[]}
        metaMap={metaMap}
        chainId={chainId}
        isLoading={isLoading}
        view={view}
      />

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <NeonButton
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Newer
          </NeonButton>
          <span className="text-xs font-mono text-text-muted">
            {page + 1} / {pages}
          </span>
          <NeonButton
            variant="ghost"
            size="sm"
            disabled={page >= pages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Older →
          </NeonButton>
        </div>
      )}

      {/* ── PG not configured hint ───────────────────────────────────────── */}
      {source === "blockchain" && (
        <GlassCard className="p-4 flex items-center gap-3">
          <Zap size={14} style={{ color: "var(--neon-blue)", flexShrink: 0 }} />
          <p className="text-xs font-mono text-text-secondary">
            Add{" "}
            <code className="font-bold text-text-primary">POSTGRES_URL</code> to{" "}
            <code className="font-bold text-text-primary">.env.local</code> for
            faster loads — currently reading live from the chain.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
