"use client";

import { useState, useEffect, useCallback } from "react";
import {
  base,
  baseSepolia,
  bsc,
  avalanche,
  arbitrum,
  polygon,
  optimism,
} from "wagmi/chains";

// ─── CoinGecko ID per chain ───────────────────────────────────────────────────

const COINGECKO_IDS: Record<number, string> = {
  [baseSepolia.id]: "ethereum",
  [base.id]: "ethereum",
  [arbitrum.id]: "ethereum",
  [optimism.id]: "ethereum",
  [bsc.id]: "binancecoin",
  [avalanche.id]: "avalanche-2",
  [polygon.id]: "matic-network",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ETHPriceState {
  usd: number;
  usdChange24h: number | null;
  loading: boolean;
  error: string | null;
  lastUpdate: number | null;
}

const CACHE_TTL = 60_000; // 1 minute

// ─── Per-chain singletons ─────────────────────────────────────────────────────
// Each chain gets its own price cache, listener set, and polling interval
// so switching chains triggers a fresh fetch without tearing down others.

interface ChainState {
  price: number;
  change24h: number | null;
  listeners: Set<(price: number, change: number | null) => void>;
  polling: boolean;
}

const chainStates = new Map<number, ChainState>();

function getChainState(chainId: number): ChainState {
  if (!chainStates.has(chainId)) {
    chainStates.set(chainId, {
      price: 0,
      change24h: null,
      listeners: new Set(),
      polling: false,
    });
  }
  return chainStates.get(chainId)!;
}

function notifyAll(chainId: number, price: number, change24h: number | null) {
  const s = getChainState(chainId);
  s.price = price;
  s.change24h = change24h;
  s.listeners.forEach((fn) => fn(price, change24h));
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchPrice(
  chainId: number,
): Promise<{ price: number; change24h: number | null }> {
  const coinId = COINGECKO_IDS[chainId] ?? "ethereum";
  const cacheKey = `coingecko_price_${coinId}`;

  // Try sessionStorage cache first
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { price, change24h, ts } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL) return { price, change24h };
    }
  } catch {
    /* ignore */
  }

  // CoinGecko simple price — free, no API key needed
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price` +
      `?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

  const data = await res.json();
  const entry = data?.[coinId];
  const price = entry?.usd ?? 0;
  const change24h = entry?.usd_24h_change ?? null;

  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({ price, change24h, ts: Date.now() }),
    );
  } catch {
    /* ignore */
  }

  return { price, change24h };
}

// ─── Singleton polling per chain ──────────────────────────────────────────────

function startPolling(chainId: number) {
  const s = getChainState(chainId);
  if (s.polling) return;
  s.polling = true;

  const poll = async () => {
    try {
      const { price, change24h } = await fetchPrice(chainId);
      notifyAll(chainId, price, change24h);
    } catch {
      /* silent — keep last known value */
    }
  };

  poll();
  setInterval(poll, CACHE_TTL);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useETHPrice(chainId: number): ETHPriceState {
  const s = getChainState(chainId);

  const [state, setState] = useState<ETHPriceState>({
    usd: s.price,
    usdChange24h: s.change24h,
    loading: s.price === 0,
    error: null,
    lastUpdate: null,
  });

  const onPrice = useCallback((price: number, change24h: number | null) => {
    setState({
      usd: price,
      usdChange24h: change24h,
      loading: false,
      error: null,
      lastUpdate: Date.now(),
    });
  }, []);

  useEffect(() => {
    const s = getChainState(chainId);
    s.listeners.add(onPrice);
    startPolling(chainId);
    // Push cached value immediately if available
    if (s.price > 0) onPrice(s.price, s.change24h);
    return () => {
      s.listeners.delete(onPrice);
    };
  }, [chainId, onPrice]);

  return state;
}

/** Lightweight hook — just returns the USD number (0 while loading) */
export function useETHUSD(chainId: number): number {
  const { usd } = useETHPrice(chainId);
  return usd;
}
