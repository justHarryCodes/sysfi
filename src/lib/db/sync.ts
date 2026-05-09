/**
 * Blockchain → PostgreSQL sync engine.
 *
 * This runs server-side in API routes (NOT in the browser).
 * Uses viem directly to read contracts and events.
 *
 * Sync strategy:
 *   1. Check last_block in sync_state for the chain.
 *   2. Read current block from RPC.
 *   3. Fetch TokenCreated events in [lastBlock+1, currentBlock] windows.
 *   4. For each new pool: read ERC-20 name/symbol + poolInfo().
 *   5. Upsert into tokens + pool_stats.
 *   6. Also refresh pool_stats for all known pools that are NOT yet graduated
 *      (to keep price / poolETH live). Batch-limit to avoid RPC timeouts.
 *   7. Update sync_state.last_block.
 */

import { createPublicClient, http, parseAbiItem, type Address } from "viem";
import { withTransaction }    from "@/lib/postgres";
import {
  upsertToken, upsertPoolStats, insertTrade,
  getSyncState, upsertSyncState, listTokens,
} from "@/lib/db/queries";
import { getContracts, CHAIN_META, SUPPORTED_CHAIN_IDS } from "@/lib/chains";
import { TOKEN_FACTORY_ABI, LAUNCH_POOL_ABI, ERC20_ABI } from "@/lib/contracts";

// How many blocks to scan per pass (env override)
const BLOCKS_PER_PASS = BigInt(
  Number(process.env.SYNC_BLOCKS_PER_PASS ?? 5000)
);

// Max pools to refresh stats for in one sync (avoid RPC hammering)
const MAX_STATS_REFRESH = 30;

// ─── Event ABIs ───────────────────────────────────────────────────────────────
const TOKEN_CREATED_ABI = parseAbiItem(
  "event TokenCreated(address indexed token, address indexed pool, address indexed creator, string name, string symbol, uint256 creationFee)"
);
const TOKENS_BOUGHT_ABI = parseAbiItem(
  "event TokensBought(address indexed buyer, uint256 ethIn, uint256 fee, uint256 tokensOut, uint256 newVirtualETH, uint256 newPrice)"
);
const TOKENS_SOLD_ABI = parseAbiItem(
  "event TokensSold(address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee, uint256 newVirtualETH, uint256 newPrice)"
);

// ─── In-process lock — prevents concurrent syncs per chain ───────────────────
const syncInProgress = new Set<number>();

// ─── Public viem client factory ───────────────────────────────────────────────
function makeClient(chainId: number) {
  const meta = CHAIN_META[chainId];
  if (!meta) throw new Error(`Unknown chainId: ${chainId}`);
  return createPublicClient({
    chain:     meta.chain,
    transport: http(meta.rpc, { retryCount: 3, timeout: 10_000 }),
  });
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface SyncResult {
  chainId:       number;
  newTokens:     number;
  statsRefreshed:number;
  tradesIndexed: number;
  fromBlock:     bigint;
  toBlock:       bigint;
  skipped?:      string;
}

export async function syncChain(chainId: number): Promise<SyncResult> {
  // Prevent concurrent syncs for the same chain
  if (syncInProgress.has(chainId)) {
    return { chainId, newTokens: 0, statsRefreshed: 0, tradesIndexed: 0, fromBlock: 0n, toBlock: 0n, skipped: "already_running" };
  }

  const contracts = getContracts(chainId);
  const factoryAddr = contracts.TOKEN_FACTORY;

  // Skip if factory not yet deployed on this chain
  if (factoryAddr === "0x0000000000000000000000000000000000000000") {
    return { chainId, newTokens: 0, statsRefreshed: 0, tradesIndexed: 0, fromBlock: 0n, toBlock: 0n, skipped: "no_factory" };
  }

  syncInProgress.add(chainId);

  try {
    const client      = makeClient(chainId);
    const currentBlock = await client.getBlockNumber();

    // Determine scan window
    const state     = await getSyncState(chainId);
    const fromBlock = state ? BigInt(state.last_block) + 1n : currentBlock - BLOCKS_PER_PASS;
    const toBlock   = currentBlock;

    if (fromBlock > toBlock) {
      return { chainId, newTokens: 0, statsRefreshed: 0, tradesIndexed: 0, fromBlock, toBlock, skipped: "up_to_date" };
    }

    // Chunk into windows to avoid RPC limits
    const windows: [bigint, bigint][] = [];
    for (let start = fromBlock; start <= toBlock; start += BLOCKS_PER_PASS + 1n) {
      windows.push([start, start + BLOCKS_PER_PASS < toBlock ? start + BLOCKS_PER_PASS : toBlock]);
    }

    let newTokens     = 0;
    let tradesIndexed = 0;

    for (const [wFrom, wTo] of windows) {
      // ── Fetch TokenCreated events ──────────────────────────────────────────
      const createdLogs = await client.getLogs({
        address:   factoryAddr,
        event:     TOKEN_CREATED_ABI,
        fromBlock: wFrom,
        toBlock:   wTo,
      }).catch(() => []);

      for (const log of createdLogs) {
        const { token, pool, creator, name, symbol } = log.args as {
          token: Address; pool: Address; creator: Address; name: string; symbol: string;
        };

        // Fetch pool info immediately for initial stats
        const [poolInfoResult] = await Promise.allSettled([
          client.readContract({ address: pool, abi: LAUNCH_POOL_ABI, functionName: "poolInfo" }),
        ]);

        const block = await client.getBlock({ blockNumber: log.blockNumber }).catch(() => null);

        await withTransaction(async (db) => {
          await upsertToken(db, {
            poolAddress:    pool,
            tokenAddress:   token,
            creatorAddress: creator,
            chainId,
            name:           name || undefined,
            symbol:         symbol || undefined,
            createdAtBlock: log.blockNumber,
            createdAt:      block ? new Date(Number(block.timestamp) * 1000) : new Date(),
          });

          if (poolInfoResult.status === "fulfilled") {
            const pi = poolInfoResult.value as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];
            await upsertPoolStats(db, {
              poolAddress:    pool,
              chainId,
              virtualEth:     pi[0],
              poolEth:        pi[2],
              feesEth:        pi[3],
              lockedTokens:   pi[4],
              lockReleaseTime:pi[5] > 0n ? pi[5] : null,
              priceWei:       pi[6],
              graduated:      pi[8],
              canGraduate:    pi[9],
            });
          }
        });

        newTokens++;
      }

      // ── Fetch trade events for known pools in this window ─────────────────
      const knownPools = await listTokens({ chainId, page: 0, limit: 500 });
      const poolAddresses = (knownPools?.rows ?? []).map(r => r.pool_address as Address);

      if (poolAddresses.length > 0) {
        const [boughtLogs, soldLogs] = await Promise.all([
          client.getLogs({ event: TOKENS_BOUGHT_ABI, fromBlock: wFrom, toBlock: wTo }).catch(() => []),
          client.getLogs({ event: TOKENS_SOLD_ABI,   fromBlock: wFrom, toBlock: wTo }).catch(() => []),
        ]);

        const poolSet = new Set(poolAddresses.map(a => a.toLowerCase()));

        const allTradeLogs = [
          ...boughtLogs.map(l => ({ ...l, tradeType: "buy"  as const })),
          ...soldLogs  .map(l => ({ ...l, tradeType: "sell" as const })),
        ].filter(l => poolSet.has((l.address ?? "").toLowerCase()));

        // Batch-fetch block timestamps for unique blocks
        const uniqueBlocks = [...new Set(allTradeLogs.map(l => l.blockNumber))];
        const blockTimeMap = new Map<bigint, Date>();
        await Promise.all(
          uniqueBlocks.slice(0, 100).map(async bn => {
            const b = await client.getBlock({ blockNumber: bn }).catch(() => null);
            if (b) blockTimeMap.set(bn, new Date(Number(b.timestamp) * 1000));
          })
        );

        for (const log of allTradeLogs) {
          const args = log.args as Record<string, bigint>;
          await withTransaction(async (db) => {
            await insertTrade(db, {
              poolAddress:  log.address,
              chainId,
              txHash:       log.transactionHash ?? "",
              blockNumber:  log.blockNumber,
              blockTime:    blockTimeMap.get(log.blockNumber),
              tradeType:    log.tradeType,
              trader:       log.tradeType === "buy"
                ? String(args.buyer  ?? "")
                : String(args.seller ?? ""),
              ethAmount:    log.tradeType === "buy"  ? (args.ethIn ?? 0n)  : (args.ethOut ?? 0n),
              tokenAmount:  log.tradeType === "buy"  ? (args.tokensOut ?? 0n) : (args.tokensIn ?? 0n),
              feeAmount:    args.fee ?? 0n,
              priceWei:     args.newPrice ?? 0n,
            });
          });
          tradesIndexed++;
        }
      }
    }

    // ── Refresh pool_stats for non-graduated pools ─────────────────────────
    const allTokens = await listTokens({ chainId, page: 0, limit: MAX_STATS_REFRESH });
    const toRefresh = (allTokens?.rows ?? [])
      .filter(r => !r.graduated)
      .slice(0, MAX_STATS_REFRESH);

    const refreshResults = await Promise.allSettled(
      toRefresh.map(r =>
        client.readContract({
          address:      r.pool_address as Address,
          abi:          LAUNCH_POOL_ABI,
          functionName: "poolInfo",
        })
      )
    );

    let statsRefreshed = 0;
    for (let i = 0; i < toRefresh.length; i++) {
      const r = refreshResults[i];
      if (r.status !== "fulfilled") continue;
      const pi = r.value as readonly [bigint,bigint,bigint,bigint,bigint,bigint,bigint,boolean,boolean,boolean];
      await withTransaction(async (db) => {
        await upsertPoolStats(db, {
          poolAddress:    toRefresh[i].pool_address,
          chainId,
          virtualEth:     pi[0],
          poolEth:        pi[2],
          feesEth:        pi[3],
          lockedTokens:   pi[4],
          lockReleaseTime:pi[5] > 0n ? pi[5] : null,
          priceWei:       pi[6],
          graduated:      pi[8],
          canGraduate:    pi[9],
        });
      });
      statsRefreshed++;
    }

    // ── Update sync cursor ─────────────────────────────────────────────────
    await withTransaction(async (db) => {
      await upsertSyncState(db, chainId, toBlock, factoryAddr);
    });

    return { chainId, newTokens, statsRefreshed, tradesIndexed, fromBlock, toBlock };

  } finally {
    syncInProgress.delete(chainId);
  }
}

/** Sync all configured chains (called from the API route) */
export async function syncAllChains(): Promise<SyncResult[]> {
  return Promise.all(SUPPORTED_CHAIN_IDS.map(id => syncChain(id).catch(err => ({
    chainId:        id,
    newTokens:      0,
    statsRefreshed: 0,
    tradesIndexed:  0,
    fromBlock:      0n,
    toBlock:        0n,
    skipped:        (err as Error).message,
  }))));
}
