/**
 * Typed PostgreSQL query helpers.
 * All functions return null if PostgreSQL is not configured.
 */

import { query, withTransaction, type TokenRow, type PoolStatsRow, type TradeRow, type SyncStateRow } from "@/lib/postgres";
import type { PoolClient } from "pg";

// ─── Tokens ───────────────────────────────────────────────────────────────────

export interface TokenWithStats extends TokenRow {
  // pool_stats fields joined
  pool_eth:    string | null;
  price_wei:   string | null;
  graduated:   boolean | null;
  can_graduate:boolean | null;
  last_synced: string | null;
}

/** Paginated list of tokens for a chain, newest first */
export async function listTokens(opts: {
  chainId:  number;
  page:     number;
  limit:    number;
  search?:  string;
}): Promise<{ rows: TokenWithStats[]; total: number } | null> {
  const { chainId, page, limit, search } = opts;
  const offset = page * limit;

  const conditions: string[] = ["t.chain_id = $1"];
  const params: unknown[]    = [chainId];
  let   pidx = 2;

  if (search) {
    conditions.push(`(t.search_vector @@ plainto_tsquery('english', $${pidx}) OR t.pool_address ILIKE $${pidx + 1} OR t.token_address ILIKE $${pidx + 1})`);
    params.push(search, `%${search}%`);
    pidx += 2;
  }

  const where = conditions.join(" AND ");

  const [countRes, rowsRes] = await Promise.all([
    query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM tokens t WHERE ${where}`,
      params
    ),
    query<TokenWithStats>(
      `SELECT
         t.*,
         ps.pool_eth,
         ps.price_wei,
         ps.graduated,
         ps.can_graduate,
         ps.last_synced
       FROM tokens t
       LEFT JOIN pool_stats ps
         ON ps.pool_address = t.pool_address AND ps.chain_id = t.chain_id
       WHERE ${where}
       ORDER BY t.created_at DESC
       LIMIT $${pidx} OFFSET $${pidx + 1}`,
      [...params, limit, offset]
    ),
  ]);

  if (!countRes || !rowsRes) return null;
  return { rows: rowsRes, total: Number(countRes[0]?.total ?? 0) };
}

/** Single token by pool address */
export async function getToken(poolAddress: string, chainId: number): Promise<TokenWithStats | null> {
  const rows = await query<TokenWithStats>(
    `SELECT t.*, ps.pool_eth, ps.price_wei, ps.fees_eth, ps.locked_tokens,
            ps.lock_release_time, ps.virtual_eth, ps.graduated, ps.can_graduate, ps.last_synced
     FROM tokens t
     LEFT JOIN pool_stats ps ON ps.pool_address = t.pool_address AND ps.chain_id = t.chain_id
     WHERE t.pool_address = $1 AND t.chain_id = $2
     LIMIT 1`,
    [poolAddress.toLowerCase(), chainId]
  );
  return rows?.[0] ?? null;
}

/** Total token count for a chain */
export async function countTokens(chainId: number): Promise<number | null> {
  const rows = await query<{ n: string }>(
    "SELECT COUNT(*) AS n FROM tokens WHERE chain_id = $1",
    [chainId]
  );
  return rows ? Number(rows[0]?.n ?? 0) : null;
}

/** Upsert token registration (from TokenCreated event or factory read) */
export async function upsertToken(
  client: PoolClient,
  t: {
    poolAddress:    string;
    tokenAddress:   string;
    creatorAddress: string;
    chainId:        number;
    name?:          string;
    symbol?:        string;
    createdAtBlock?:bigint;
    createdAt?:     Date;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO tokens
       (pool_address, token_address, creator_address, chain_id, name, symbol, created_at_block, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (pool_address, chain_id)
     DO UPDATE SET
       name             = COALESCE(EXCLUDED.name, tokens.name),
       symbol           = COALESCE(EXCLUDED.symbol, tokens.symbol),
       created_at_block = COALESCE(EXCLUDED.created_at_block, tokens.created_at_block)`,
    [
      t.poolAddress.toLowerCase(),
      t.tokenAddress.toLowerCase(),
      t.creatorAddress.toLowerCase(),
      t.chainId,
      t.name   ?? null,
      t.symbol ?? null,
      t.createdAtBlock?.toString() ?? null,
      t.createdAt ?? new Date(),
    ]
  );
}

// ─── Pool stats ───────────────────────────────────────────────────────────────

/** Upsert pool live metrics */
export async function upsertPoolStats(
  client: PoolClient,
  s: {
    poolAddress:    string;
    chainId:        number;
    virtualEth:     bigint;
    poolEth:        bigint;
    feesEth:        bigint;
    lockedTokens:   bigint;
    lockReleaseTime:bigint | null;
    priceWei:       bigint;
    graduated:      boolean;
    canGraduate:    boolean;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO pool_stats
       (pool_address, chain_id, virtual_eth, pool_eth, fees_eth, locked_tokens,
        lock_release_time, price_wei, graduated, can_graduate, last_synced)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
     ON CONFLICT (pool_address, chain_id)
     DO UPDATE SET
       virtual_eth       = EXCLUDED.virtual_eth,
       pool_eth          = EXCLUDED.pool_eth,
       fees_eth          = EXCLUDED.fees_eth,
       locked_tokens     = EXCLUDED.locked_tokens,
       lock_release_time = EXCLUDED.lock_release_time,
       price_wei         = EXCLUDED.price_wei,
       graduated         = EXCLUDED.graduated,
       can_graduate      = EXCLUDED.can_graduate,
       last_synced       = NOW()`,
    [
      s.poolAddress.toLowerCase(),
      s.chainId,
      s.virtualEth.toString(),
      s.poolEth.toString(),
      s.feesEth.toString(),
      s.lockedTokens.toString(),
      s.lockReleaseTime?.toString() ?? null,
      s.priceWei.toString(),
      s.graduated,
      s.canGraduate,
    ]
  );
}

/** Get pool stats for a single pool */
export async function getPoolStats(poolAddress: string, chainId: number): Promise<PoolStatsRow | null> {
  const rows = await query<PoolStatsRow>(
    "SELECT * FROM pool_stats WHERE pool_address=$1 AND chain_id=$2 LIMIT 1",
    [poolAddress.toLowerCase(), chainId]
  );
  return rows?.[0] ?? null;
}

// ─── Trades ───────────────────────────────────────────────────────────────────

/** Insert a trade (buy or sell), silently ignoring duplicates */
export async function insertTrade(
  client: PoolClient,
  tr: {
    poolAddress:  string;
    chainId:      number;
    txHash:       string;
    blockNumber:  bigint;
    blockTime?:   Date;
    tradeType:    "buy" | "sell";
    trader:       string;
    ethAmount:    bigint;
    tokenAmount:  bigint;
    feeAmount:    bigint;
    priceWei:     bigint;
  }
): Promise<void> {
  await client.query(
    `INSERT INTO trades
       (pool_address, chain_id, tx_hash, block_number, block_time,
        trade_type, trader, eth_amount, token_amount, fee_amount, price_wei)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (tx_hash, chain_id) DO NOTHING`,
    [
      tr.poolAddress.toLowerCase(), tr.chainId,
      tr.txHash.toLowerCase(), tr.blockNumber.toString(), tr.blockTime ?? null,
      tr.tradeType, tr.trader.toLowerCase(),
      tr.ethAmount.toString(), tr.tokenAmount.toString(),
      tr.feeAmount.toString(), tr.priceWei.toString(),
    ]
  );
}

/** Recent trades for a pool (for the chart / activity feed) */
export async function listTrades(poolAddress: string, chainId: number, limit = 200): Promise<TradeRow[]> {
  const rows = await query<TradeRow>(
    `SELECT * FROM trades
     WHERE pool_address=$1 AND chain_id=$2
     ORDER BY block_number DESC LIMIT $3`,
    [poolAddress.toLowerCase(), chainId, limit]
  );
  return rows ?? [];
}

// ─── Sync state ───────────────────────────────────────────────────────────────

export async function getSyncState(chainId: number): Promise<SyncStateRow | null> {
  const rows = await query<SyncStateRow>(
    "SELECT * FROM sync_state WHERE chain_id=$1 LIMIT 1",
    [chainId]
  );
  return rows?.[0] ?? null;
}

export async function upsertSyncState(
  client: PoolClient,
  chainId:        number,
  lastBlock:      bigint,
  factoryAddress: string
): Promise<void> {
  await client.query(
    `INSERT INTO sync_state (chain_id, factory_address, last_block, last_synced)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (chain_id) DO UPDATE
       SET factory_address = EXCLUDED.factory_address,
           last_block      = EXCLUDED.last_block,
           last_synced     = NOW()`,
    [chainId, factoryAddress.toLowerCase(), lastBlock.toString()]
  );
}
