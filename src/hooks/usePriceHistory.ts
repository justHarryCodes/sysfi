"use client";

import { useState, useEffect, useRef } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";

export interface PricePoint {
  time: number; // unix seconds
  priceETH: number; // price in ETH per whole token  (== contract _priceInWei / 1e18)
  type: "buy" | "sell" | "init";
  ethVolume: number; // gross ETH in/out (before fee)
  blockNumber: bigint;
}

// ─── Contract constants — must mirror LaunchPool.sol exactly ─────────────────
//
//   INIT_V_ETH   = 4 ether            (line: uint256 public constant INIT_V_ETH = 4 ether)
//   POOL_TOKENS  = TOTAL_SUPPLY * 95 / 100  = 950_000_000e18
//   K            = INIT_V_ETH * POOL_TOKENS (constant forever)
//
//   _priceInWei(vETH) = vETH² × 1e18 / K
//
// NOTE: If you ever redeploy with a different INIT_V_ETH, update the value
// below AND bump CACHE_VERSION so stale cached prices are discarded.

const INIT_V_ETH_WEI = 4n * 10n ** 18n; // 4 ETH
const TOTAL_SUPPLY_WEI = 1_000_000_000n * 10n ** 18n;
const POOL_TOKENS_WEI = (TOTAL_SUPPLY_WEI * 95n) / 100n; // 950 M tokens
const K_WEI = INIT_V_ETH_WEI * POOL_TOKENS_WEI; // ≈ 3.8e45

/**
 * Replicates LaunchPool._priceInWei(vETH) exactly.
 * Returns price as ETH per whole token (JS number).
 *
 * Formula (Solidity):  (vETH * vETH * 1e18) / K
 * We keep bigint throughout to match contract integer arithmetic, then
 * divide by 1e18 only at the end to get the float ETH price.
 */
export function priceFromVirtualETH(virtualETHWei: bigint): number {
  const numerator = virtualETHWei * virtualETHWei * 10n ** 18n;
  const priceWei = numerator / K_WEI;
  return Number(priceWei) / 1e18;
}

/**
 * Opening price before any trades (virtualETH == INIT_V_ETH).
 * Used to anchor the left edge of the chart with the genesis candle.
 */
export const GENESIS_PRICE_ETH = priceFromVirtualETH(INIT_V_ETH_WEI);

// ─── ABIs ─────────────────────────────────────────────────────────────────────

const BOUGHT_ABI = parseAbiItem(
  "event TokensBought(address indexed buyer, uint256 ethIn, uint256 fee, uint256 tokensOut, uint256 newVirtualETH, uint256 newPrice)",
);
const SOLD_ABI = parseAbiItem(
  "event TokensSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256 newVirtualETH, uint256 newPrice)",
);
const INIT_ABI = parseAbiItem(
  "event PoolInitialized(address indexed pool, address indexed token, address indexed creator, uint256 lockReleaseTime)",
);

// ─── Cache ────────────────────────────────────────────────────────────────────

interface SerializedPoint {
  time: number;
  priceETH: number;
  type: "buy" | "sell" | "init";
  ethVolume: number;
  blockNumber: string;
}

interface CacheEntry {
  points: SerializedPoint[];
  lastBlock: string;
  ts: number;
}

// Bump this whenever K constants or the serialization format changes.
// A stale cache with the old K will serve wrong prices silently.
const CACHE_VERSION = "v5";
const CACHE_TTL_MS = 10 * 60 * 1000;
const INITIAL_LOOKBACK = 50_000n; // ~27 hrs on Base @ 2 s/block
const MAX_POINTS = 2_000;
const TS_BATCH_SIZE = 50;

// SSR guard — localStorage is not available during server-side rendering
const isBrowser = typeof window !== "undefined";

function cacheKey(addr: string) {
  return `price_history_${CACHE_VERSION}_${addr.toLowerCase()}`;
}

function loadCache(addr: string): CacheEntry | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(cacheKey(addr));
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null;
  }
}

function saveCache(addr: string, entry: CacheEntry) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(cacheKey(addr), JSON.stringify(entry));
  } catch {
    // Storage full — evict old price history entries and retry once
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("price_history_")) localStorage.removeItem(k);
      }
      localStorage.setItem(cacheKey(addr), JSON.stringify(entry));
    } catch {
      /* give up */
    }
  }
}

function deserialize(pts: SerializedPoint[]): PricePoint[] {
  return pts.map((p) => ({ ...p, blockNumber: BigInt(p.blockNumber) }));
}
function serialize(pts: PricePoint[]): SerializedPoint[] {
  return pts.map((p) => ({ ...p, blockNumber: p.blockNumber.toString() }));
}

// ─── Block timestamp fetcher (batched + linear interpolation fallback) ────────

async function fetchBlockTimestamps(
  blockNumbers: bigint[],
  client: NonNullable<ReturnType<typeof usePublicClient>>,
): Promise<Map<bigint, number>> {
  const unique = [...new Set(blockNumbers)].sort((a, b) => (a < b ? -1 : 1));
  const tsMap = new Map<bigint, number>();

  for (let i = 0; i < unique.length; i += TS_BATCH_SIZE) {
    const batch = unique.slice(i, i + TS_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((bn) => client.getBlock({ blockNumber: bn })),
    );
    results.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        tsMap.set(batch[idx], Number(r.value.timestamp));
      }
    });
  }

  // Linear interpolation for any block whose RPC call failed
  for (let i = 0; i < unique.length; i++) {
    const bn = unique[i];
    if (tsMap.has(bn)) continue;

    let prevBn: bigint | null = null;
    let nextBn: bigint | null = null;

    for (let j = i - 1; j >= 0; j--) {
      if (tsMap.has(unique[j])) {
        prevBn = unique[j];
        break;
      }
    }
    for (let j = i + 1; j < unique.length; j++) {
      if (tsMap.has(unique[j])) {
        nextBn = unique[j];
        break;
      }
    }

    if (prevBn !== null && nextBn !== null) {
      const prevTs = tsMap.get(prevBn)!;
      const nextTs = tsMap.get(nextBn)!;
      const total = Number(nextBn - prevBn);
      const offset = Number(bn - prevBn);
      tsMap.set(bn, Math.round(prevTs + (offset / total) * (nextTs - prevTs)));
    } else if (prevBn !== null) {
      tsMap.set(bn, tsMap.get(prevBn)! + Number(bn - prevBn) * 2);
    } else if (nextBn !== null) {
      tsMap.set(bn, tsMap.get(nextBn)! - Number(nextBn - bn) * 2);
    }
  }

  return tsMap;
}

// ─── Log → PricePoint ────────────────────────────────────────────────────────
//
// We derive price from newVirtualETH using the same formula as the contract
// (_priceInWei), rather than reading the emitted newPrice field directly.
// Reasons:
//   • The emitted newPrice may be 0 on older deployments with a price-emit bug.
//   • priceFromVirtualETH(newVirtualETH) is mathematically identical to what
//     the contract computes, so we always get the canonical value.

function logToPoint(
  log: {
    args: Record<string, bigint>;
    blockNumber: bigint;
    type: "buy" | "sell";
  },
  ts: number,
): PricePoint | null {
  const args = log.args;

  const newVirtualETH = args.newVirtualETH ?? 0n;
  if (newVirtualETH === 0n) return null; // malformed / pre-init log

  const priceETH = priceFromVirtualETH(newVirtualETH);
  if (priceETH <= 0) return null;

  // Gross ETH volume: ethIn (gross buy) or ethOut (net sell).
  // Both give a consistent ETH-denominated volume metric across both sides.
  const rawVol =
    log.type === "buy"
      ? (args.ethIn ?? 0n) // msg.value (gross, fee included)
      : (args.ethOut ?? 0n); // net ETH returned to seller

  return {
    time: ts,
    priceETH,
    type: log.type,
    ethVolume: Number(rawVol) / 1e18,
    blockNumber: log.blockNumber,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePriceHistory(poolAddr: `0x${string}` | undefined) {
  const client = usePublicClient();

  const [points, setPoints] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track per-address hydration so switching pools re-fetches correctly
  const hydratedRef = useRef<string>("");
  const poolAddrRef = useRef(poolAddr);
  poolAddrRef.current = poolAddr;

  // ── Step 1: Hydrate from localStorage synchronously ──────────────────────
  useEffect(() => {
    if (!poolAddr) return;
    if (hydratedRef.current === poolAddr.toLowerCase()) return;
    hydratedRef.current = poolAddr.toLowerCase();

    const cached = loadCache(poolAddr);
    if (cached && cached.points.length > 0) {
      setPoints(deserialize(cached.points));
    }
  }, [poolAddr]);

  // ── Step 2: Fetch historical logs (incremental) ───────────────────────────
  useEffect(() => {
    if (!poolAddr || !client) return;
    let cancelled = false;

    async function load() {
      const cached = loadCache(poolAddr!);
      const isStale = !cached || Date.now() - cached.ts > CACHE_TTL_MS;
      const hasNoData = !cached || cached.points.length === 0;

      // Skip only when cache is fresh and has real data
      if (!isStale && !hasNoData && cached?.lastBlock) return;

      setLoading(true);
      setError(null);

      try {
        const currentBlock = await client!.getBlockNumber();
        const lastKnownBlock = cached?.lastBlock
          ? BigInt(cached.lastBlock)
          : 0n;

        const fromBlock =
          lastKnownBlock > 0n && !hasNoData
            ? lastKnownBlock + 1n
            : currentBlock > INITIAL_LOOKBACK
              ? currentBlock - INITIAL_LOOKBACK
              : 0n;

        if (fromBlock > currentBlock) {
          if (!cancelled) setLoading(false);
          return;
        }

        // Fetch all three event types in parallel
        const [boughtLogs, soldLogs, initLogs] = await Promise.all([
          client!.getLogs({
            address: poolAddr,
            event: BOUGHT_ABI,
            fromBlock,
            toBlock: "latest",
          }),
          client!.getLogs({
            address: poolAddr,
            event: SOLD_ABI,
            fromBlock,
            toBlock: "latest",
          }),
          // PoolInitialized only needed on the very first fetch (no cached data)
          hasNoData
            ? client!.getLogs({
                address: poolAddr,
                event: INIT_ABI,
                fromBlock: 0n,
                toBlock: "latest",
              })
            : Promise.resolve([]),
        ]);

        const tradeLogs = [
          ...boughtLogs.map((l) => ({ ...l, type: "buy" as const })),
          ...soldLogs.map((l) => ({ ...l, type: "sell" as const })),
        ].sort((a, b) => Number(a.blockNumber - b.blockNumber));

        const allBlockNumbers = [
          ...tradeLogs.map((l) => l.blockNumber),
          ...initLogs.map((l) => l.blockNumber),
        ];

        let blockTs = new Map<bigint, number>();
        if (allBlockNumbers.length > 0) {
          blockTs = await fetchBlockTimestamps(allBlockNumbers, client!);
        }

        // Genesis point from PoolInitialized — anchors the chart left edge
        const genesisPoints: PricePoint[] = initLogs.flatMap((l) => {
          const ts = blockTs.get(l.blockNumber);
          if (!ts) return [];
          return [
            {
              time: ts,
              priceETH: GENESIS_PRICE_ETH,
              type: "init" as const,
              ethVolume: 0,
              blockNumber: l.blockNumber,
            },
          ];
        });

        const tradePoints: PricePoint[] = tradeLogs.flatMap((l) => {
          const ts = blockTs.get(l.blockNumber);
          if (!ts) return [];
          const pt = logToPoint(
            {
              args: l.args as Record<string, bigint>,
              blockNumber: l.blockNumber,
              type: l.type,
            },
            ts,
          );
          return pt ? [pt] : [];
        });

        const newPts = [...genesisPoints, ...tradePoints];

        if (newPts.length === 0 && tradeLogs.length === 0) {
          saveCache(poolAddr!, {
            points: cached?.points ?? [],
            lastBlock: currentBlock.toString(),
            ts: Date.now(),
          });
          if (!cancelled) setLoading(false);
          return;
        }

        const existingPts = cached ? deserialize(cached.points) : [];
        const existingKeys = new Set(
          existingPts.map((p) => `${p.blockNumber}_${p.type}`),
        );
        const merged = [
          ...existingPts,
          ...newPts.filter(
            (p) => !existingKeys.has(`${p.blockNumber}_${p.type}`),
          ),
        ]
          .sort((a, b) => a.time - b.time)
          .slice(-MAX_POINTS);

        if (!cancelled) {
          setPoints(merged);
          saveCache(poolAddr!, {
            points: serialize(merged),
            lastBlock: currentBlock.toString(),
            ts: Date.now(),
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [poolAddr, client]);

  // ── Step 3: Live event subscription ──────────────────────────────────────
  useEffect(() => {
    if (!poolAddr || !client) return;

    const blockTsCache = new Map<bigint, number>();

    async function getTs(blockNumber: bigint): Promise<number> {
      if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber)!;
      try {
        const b = await client!.getBlock({ blockNumber });
        const ts = Number(b.timestamp);
        blockTsCache.set(blockNumber, ts);
        return ts;
      } catch {
        return Math.floor(Date.now() / 1000);
      }
    }

    function appendPoint(pt: PricePoint) {
      setPoints((prev) => {
        const key = `${pt.blockNumber}_${pt.type}`;
        if (prev.some((p) => `${p.blockNumber}_${p.type}` === key)) return prev;

        const next = [...prev, pt].slice(-MAX_POINTS);

        // Persist live point to cache using the ref (not closure-captured poolAddr)
        const addr = poolAddrRef.current;
        if (addr) {
          const cached = loadCache(addr);
          if (cached) {
            saveCache(addr, {
              ...cached,
              points: serialize(next),
              ts: Date.now(),
            });
          }
        }
        return next;
      });
    }

    const unwatchBuy = client.watchContractEvent({
      address: poolAddr,
      abi: [BOUGHT_ABI],
      eventName: "TokensBought",
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, bigint>;
          const ts = await getTs(log.blockNumber!);
          const pt = logToPoint(
            { args, blockNumber: log.blockNumber!, type: "buy" },
            ts,
          );
          if (pt) appendPoint(pt);
        }
      },
    });

    const unwatchSell = client.watchContractEvent({
      address: poolAddr,
      abi: [SOLD_ABI],
      eventName: "TokensSold",
      onLogs: async (logs) => {
        for (const log of logs) {
          const args = log.args as Record<string, bigint>;
          const ts = await getTs(log.blockNumber!);
          const pt = logToPoint(
            { args, blockNumber: log.blockNumber!, type: "sell" },
            ts,
          );
          if (pt) appendPoint(pt);
        }
      },
    });

    return () => {
      unwatchBuy();
      unwatchSell();
    };
  }, [poolAddr, client]);

  return { points, loading, error };
}
