"use client";

import { useState, useEffect } from "react";
import { usePublicClient }      from "wagmi";
import { parseAbiItem }         from "viem";

export interface PricePoint {
  time:       number;   // unix timestamp (seconds)
  priceETH:   number;   // price in ETH (float)
  type:       "buy" | "sell" | "init";
  ethVolume:  number;   // ETH traded in this event
  blockNumber:bigint;
}

const CACHE_PREFIX = "price_history_";
const CACHE_TTL    = 5 * 60 * 1000; // 5 min

const BOUGHT_ABI = parseAbiItem(
  "event TokensBought(address indexed buyer, uint256 ethIn, uint256 fee, uint256 tokensOut, uint256 newVirtualETH, uint256 newPrice)"
);
const SOLD_ABI = parseAbiItem(
  "event TokensSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256 newVirtualETH, uint256 newPrice)"
);

function cacheKey(addr: string) { return CACHE_PREFIX + addr.toLowerCase(); }

function loadCache(addr: string): { points: PricePoint[]; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(addr));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function saveCache(addr: string, points: PricePoint[]) {
  try {
    sessionStorage.setItem(cacheKey(addr), JSON.stringify({ points, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function usePriceHistory(poolAddr: `0x${string}` | undefined) {
  const client = usePublicClient();
  const [points,  setPoints]  = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!poolAddr || !client) return;
    let cancelled = false;

    async function load() {
      // Try cache
      const cached = loadCache(poolAddr!);
      if (cached) { setPoints(cached.points); return; }

      setLoading(true);
      setError(null);

      try {
        // Fetch last ~5000 blocks worth of events (Base Sepolia ~2s blocks → ~3hr)
        const currentBlock = await client!.getBlockNumber();
        const fromBlock    = currentBlock > 5000n ? currentBlock - 5000n : 0n;

        const [boughtLogs, soldLogs] = await Promise.all([
          client!.getLogs({ address: poolAddr, event: BOUGHT_ABI, fromBlock, toBlock: "latest" }),
          client!.getLogs({ address: poolAddr, event: SOLD_ABI,   fromBlock, toBlock: "latest" }),
        ]);

        // Combine and sort by block
        const allLogs = [
          ...boughtLogs.map(l => ({ ...l, type: "buy"  as const })),
          ...soldLogs  .map(l => ({ ...l, type: "sell" as const })),
        ].sort((a, b) => Number(a.blockNumber - b.blockNumber));

        if (allLogs.length === 0) {
          if (!cancelled) { setPoints([]); setLoading(false); }
          return;
        }

        // Get unique block numbers to fetch timestamps
        const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber))];
        // Batch-fetch blocks (limit to 50 unique to avoid hammering RPC)
        const blocksToFetch = uniqueBlocks.slice(-50);
        const blockData = await Promise.all(
          blocksToFetch.map(bn => client!.getBlock({ blockNumber: bn }))
        );
        const blockTimestamps = new Map<bigint, number>();
        blockData.forEach(b => blockTimestamps.set(b.number, Number(b.timestamp)));

        // Estimate timestamps for blocks we didn't fetch (2s per block on Base)
        const latestKnown = blockData[blockData.length - 1];
        allLogs.forEach(l => {
          if (!blockTimestamps.has(l.blockNumber) && latestKnown) {
            const diff = Number(latestKnown.number - l.blockNumber);
            blockTimestamps.set(l.blockNumber, Number(latestKnown.timestamp) - diff * 2);
          }
        });

        const pts: PricePoint[] = allLogs.map(l => {
          const args      = l.args as Record<string, bigint>;
          const priceWei  = args.newPrice ?? 0n;
          const ethAmount = l.type === "buy"
            ? Number(args.ethIn ?? 0n)   / 1e18
            : Number(args.ethOut ?? 0n)  / 1e18;

          return {
            time:        blockTimestamps.get(l.blockNumber) ?? 0,
            priceETH:    Number(priceWei) / 1e18,
            type:        l.type,
            ethVolume:   ethAmount,
            blockNumber: l.blockNumber,
          };
        }).filter(p => p.time > 0);

        if (!cancelled) {
          setPoints(pts);
          saveCache(poolAddr!, pts);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [poolAddr, client]);

  return { points, loading, error };
}
