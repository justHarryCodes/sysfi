"use client";

import { useState, useEffect, useCallback } from "react";
import { useChainId }                        from "wagmi";

export interface TokenMetadata {
  poolAddress:    string;
  chainId:        number;
  tokenAddress:   string;
  creatorAddress: string;
  name:           string;
  symbol:         string;
  description:    string;
  hasLogo:        boolean;
  hasBanner:      boolean;
  /** Full base64 JPEG — only populated when withImages=1 was requested */
  logoData?:      string;
  bannerData?:    string;
  website?:       string;
  twitter?:       string;
  telegram?:      string;
  discord?:       string;
}

/** Build URL for an image served from MongoDB */
export function imageUrl(poolAddress: string, chainId: number, type: "logo" | "banner"): string {
  return `/api/images/${poolAddress.toLowerCase()}?chainId=${chainId}&type=${type}`;
}

// ─── In-memory cache (2-min TTL) ─────────────────────────────────────────────
const CACHE = new Map<string, { data: TokenMetadata | null; ts: number }>();
const TTL   = 2 * 60_000;

function key(pool: string, chainId: number) {
  return `${pool.toLowerCase()}:${chainId}`;
}

// ─── Single record ────────────────────────────────────────────────────────────
export function useTokenMetadata(poolAddress: string | undefined) {
  const chainId = useChainId();
  const [meta,    setMeta]    = useState<TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!poolAddress) return;
    const k = key(poolAddress, chainId);

    // Serve from cache if fresh
    const cached = CACHE.get(k);
    if (cached && Date.now() - cached.ts < TTL) { setMeta(cached.data); return; }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/metadata/${poolAddress}?chainId=${chainId}`)
      .then(r  => r.ok ? r.json() : null)
      .then(j  => {
        const data = (j?.data ?? null) as TokenMetadata | null;
        if (!cancelled) { setMeta(data); CACHE.set(k, { data, ts: Date.now() }); }
      })
      .catch(() => { if (!cancelled) setMeta(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [poolAddress, chainId]);

  /** Save full metadata + images to MongoDB */
  const save = useCallback(async (fields: Partial<TokenMetadata> & {
    tokenAddress?:   string;
    creatorAddress?: string;
  }) => {
    if (!poolAddress) return;
    const res = await fetch("/api/metadata", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ poolAddress, chainId, ...fields }),
    });
    if (res.ok) {
      const j    = await res.json();
      const data = (j?.data ?? null) as TokenMetadata | null;
      setMeta(data);
      CACHE.set(key(poolAddress, chainId), { data, ts: Date.now() });
    }
  }, [poolAddress, chainId]);

  /** Partial update (no images required) */
  const update = useCallback(async (fields: Partial<Omit<TokenMetadata, "poolAddress" | "chainId">>) => {
    if (!poolAddress) return;
    await fetch(`/api/metadata/${poolAddress}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ chainId, ...fields }),
    });
    const updated = { ...(meta ?? {}), ...fields } as TokenMetadata;
    setMeta(updated);
    CACHE.set(key(poolAddress, chainId), { data: updated, ts: Date.now() });
  }, [poolAddress, chainId, meta]);

  return { meta, loading, save, update };
}

// ─── Bulk (for explore grid) — single request instead of N ───────────────────
export function useBulkMetadata(poolAddresses: string[]) {
  const chainId = useChainId();
  const [map, setMap] = useState<Record<string, TokenMetadata>>({});

  useEffect(() => {
    if (!poolAddresses.length) return;
    let cancelled = false;

    // Serve cached entries immediately so cards render without waiting
    const initial: Record<string, TokenMetadata> = {};
    const toFetch: string[] = [];
    for (const p of poolAddresses) {
      const cached = CACHE.get(key(p, chainId));
      if (cached?.data) initial[p.toLowerCase()] = cached.data;
      else toFetch.push(p);
    }
    if (Object.keys(initial).length) setMap(initial);
    if (!toFetch.length) return;

    // One bulk request instead of toFetch.length individual requests
    const poolsParam = toFetch.map(p => p.toLowerCase()).join(",");
    fetch(`/api/metadata/bulk?pools=${poolsParam}&chainId=${chainId}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (cancelled || !j?.data) return;
        const incoming = j.data as Record<string, TokenMetadata>;
        const now = Date.now();
        for (const [addr, data] of Object.entries(incoming)) {
          CACHE.set(key(addr, chainId), { data, ts: now });
        }
        setMap(prev => ({ ...prev, ...incoming }));
      })
      .catch(() => {/* non-critical — cards still render without metadata */});

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolAddresses.join(","), chainId]);

  return map;
}
