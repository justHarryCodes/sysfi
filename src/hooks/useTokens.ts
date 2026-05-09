"use client";

/**
 * useTokens — primary hook for the Explore page.
 *
 * Reads from PostgreSQL via /api/tokens (fast).
 * If PG returns { fallback: true } it automatically falls back to the blockchain
 * via useTokensPaginated + useTotalTokens (slow but always available).
 *
 * This means the UI works in three modes:
 *   ① PG available + synced  → instant load from database
 *   ② PG available + syncing → stale data immediately + live update when done
 *   ③ PG not configured      → direct blockchain reads (previous behaviour)
 */

import { useState, useEffect, useCallback } from "react";
import { useChainId }                        from "wagmi";
import { useTotalTokens, useTokensPaginated, type TokenInfo } from "@/hooks/useTokenFactory";

export interface PGTokenRow {
  id:              number;
  pool_address:    string;
  token_address:   string;
  creator_address: string;
  chain_id:        number;
  name:            string | null;
  symbol:          string | null;
  created_at:      string;
  // from pool_stats join
  pool_eth:        string | null;
  price_wei:       string | null;
  graduated:       boolean | null;
  can_graduate:    boolean | null;
  last_synced:     string | null;
}

/** Convert a PostgreSQL token row to the TokenInfo shape used by existing components */
export function pgRowToTokenInfo(row: PGTokenRow): TokenInfo {
  return {
    token:     row.token_address   as `0x${string}`,
    pool:      row.pool_address    as `0x${string}`,
    creator:   row.creator_address as `0x${string}`,
    createdAt: BigInt(Math.floor(new Date(row.created_at).getTime() / 1000)),
  };
}

interface UseTokensOptions {
  page:    number;
  limit:   number;
  search?: string;
}

interface UseTokensResult {
  tokens:    PGTokenRow[];
  tokenInfos:TokenInfo[];           // same data as TokenInfo for component compat
  total:     number;
  isLoading: boolean;
  source:    "postgres" | "blockchain" | "loading";
  syncedAt:  string | null;
  refetch:   () => void;
}

// ─── In-memory cache (prevents re-fetching on re-renders) ────────────────────
interface CacheEntry {
  rows:     PGTokenRow[];
  total:    number;
  ts:       number;
  syncedAt: string | null;
}
const CACHE     = new Map<string, CacheEntry>();
const CACHE_TTL = 15_000; // 15 s — enough to avoid hammering the API on navigation

function cacheKey(chainId: number, page: number, limit: number, search?: string) {
  return `${chainId}:${page}:${limit}:${search ?? ""}`;
}

export function useTokens({ page, limit, search }: UseTokensOptions): UseTokensResult {
  const chainId = useChainId();
  const [rows,      setRows]      = useState<PGTokenRow[]>([]);
  const [total,     setTotal]     = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [source,    setSource]    = useState<"postgres" | "blockchain" | "loading">("loading");
  const [syncedAt,  setSyncedAt]  = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  const refetch = useCallback(() => {
    // Bust cache for this key
    CACHE.delete(cacheKey(chainId, page, limit, search));
    setTick(t => t + 1);
  }, [chainId, page, limit, search]);

  // ── Fetch from PostgreSQL API ────────────────────────────────────────────
  useEffect(() => {
    if (!chainId) return;
    const k = cacheKey(chainId, page, limit, search);

    // Serve stale cache instantly
    const cached = CACHE.get(k);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setRows(cached.rows);
      setTotal(cached.total);
      setSyncedAt(cached.syncedAt);
      setSource("postgres");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const url = new URL("/api/tokens", window.location.origin);
    url.searchParams.set("chainId", String(chainId));
    url.searchParams.set("page",    String(page));
    url.searchParams.set("limit",   String(limit));
    if (search) url.searchParams.set("search", search);

    fetch(url.toString())
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled) return;
        if (!json || json.fallback) {
          // PG not available — signal to use blockchain hook
          setSource("blockchain");
          setIsLoading(false);
          return;
        }
        const pgRows = (json.data ?? []) as PGTokenRow[];
        setRows(pgRows);
        setTotal(json.total ?? 0);
        setSyncedAt(json.synced_at ?? null);
        setSource("postgres");
        CACHE.set(k, { rows: pgRows, total: json.total ?? 0, ts: Date.now(), syncedAt: json.synced_at ?? null });
      })
      .catch(() => {
        if (!cancelled) setSource("blockchain");
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, page, limit, search, tick]);

  const tokenInfos = rows.map(pgRowToTokenInfo);
  return { tokens: rows, tokenInfos, total, isLoading, source, syncedAt, refetch };
}

// ─── Blockchain fallback — used when PG is not available ─────────────────────
export function useTokensBlockchain(opts: UseTokensOptions & { enabled: boolean }) {
  const { data: total }    = useTotalTokens();
  const totalNum           = Number(total ?? 0n);
  const count              = Math.min(opts.limit, Math.max(0, totalNum - opts.page * opts.limit));
  const start              = Math.max(0, totalNum - opts.limit * (opts.page + 1));

  const { data, isLoading } = useTokensPaginated(start, count);

  const tokens: TokenInfo[] = data
    ? [...(data as TokenInfo[])].reverse()
    : [];

  return { tokens, total: totalNum, isLoading };
}
