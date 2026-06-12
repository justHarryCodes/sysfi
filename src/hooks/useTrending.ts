"use client";

import { useState, useEffect } from "react";

export interface TrendingCoin {
  id:          string;
  name:        string;
  symbol:      string;
  thumb:       string;
  price_btc:   number;
  score:       number;
  data?: {
    price:              string | number;
    price_change_percentage_24h?: { usd: number };
    market_cap?:        string;
    total_volume?:      string;
  };
}

interface TrendingState {
  coins:   TrendingCoin[];
  loading: boolean;
  error:   string | null;
}

const CACHE_KEY = "trending_coins_cache";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export function useTrending(): TrendingState {
  const [state, setState] = useState<TrendingState>({
    coins:   [],
    loading: true,
    error:   null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchTrending() {
      // Check cache
      try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setState({ coins: data, loading: false, error: null });
            return;
          }
        }
      } catch { /* ignore cache errors */ }

      try {
        // CoinGecko free API — trending search (top 15 globally)
        const res = await fetch(
          "https://api.coingecko.com/api/v3/search/trending",
          { headers: { Accept: "application/json" }, next: { revalidate: 120 } }
        );

        if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
        const json = await res.json();

        const coins: TrendingCoin[] = (json.coins ?? []).slice(0, 15).map(
          (item: { item: TrendingCoin }) => item.item
        );

        if (!cancelled) {
          setState({ coins, loading: false, error: null });
          // Cache result
          try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({
              data:      coins,
              timestamp: Date.now(),
            }));
          } catch { /* ignore */ }
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Failed to fetch",
          }));
        }
      }
    }

    fetchTrending();
    const interval = setInterval(fetchTrending, CACHE_TTL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return state;
}
