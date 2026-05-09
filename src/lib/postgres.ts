/**
 * PostgreSQL connection pool — singleton with Next.js hot-reload safety.
 *
 * Uses the `pg` (node-postgres) package.  Connection string is read from
 * POSTGRES_URL in .env.local.
 *
 * If POSTGRES_URL is not set the pool is null and all queries return
 * graceful fallbacks — the app degrades to blockchain-only mode.
 */

import { Pool, type PoolClient } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool | null {
  const url = process.env.POSTGRES_URL;
  if (!url) return null;

  return new Pool({
    connectionString: url,
    ssl:              url.includes("localhost") ? false : { rejectUnauthorized: false },
    max:              10,
    idleTimeoutMillis:30_000,
    connectionTimeoutMillis: 3_000,
  });
}

let pgPool: Pool | null;

if (process.env.NODE_ENV === "development") {
  if (!globalThis._pgPool) {
    globalThis._pgPool = createPool() ?? undefined;
  }
  pgPool = globalThis._pgPool ?? null;
} else {
  pgPool = createPool();
}

export default pgPool;

/** True when PostgreSQL is configured and available */
export function hasPG(): boolean {
  return pgPool !== null;
}

/**
 * Execute a query. Returns null if PostgreSQL is not configured.
 * The caller decides what to do (fall back to blockchain, return empty list, etc.)
 */
export async function query<T = Record<string, unknown>>(
  sql:    string,
  params: unknown[] = []
): Promise<T[] | null> {
  if (!pgPool) return null;
  try {
    const result = await pgPool.query(sql, params);
    return result.rows as T[];
  } catch (err) {
    console.error("[postgres] query error:", (err as Error).message);
    throw err;
  }
}

/** Execute inside a transaction. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T | null> {
  if (!pgPool) return null;
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Row shapes returned by PostgreSQL queries */
export interface TokenRow {
  id:               number;
  pool_address:     string;
  token_address:    string;
  creator_address:  string;
  chain_id:         number;
  name:             string | null;
  symbol:           string | null;
  created_at_block: string | null;
  created_at:       string;
}

export interface PoolStatsRow {
  pool_address:      string;
  chain_id:          number;
  virtual_eth:       string;
  pool_eth:          string;
  fees_eth:          string;
  locked_tokens:     string;
  lock_release_time: string | null;
  price_wei:         string;
  graduated:         boolean;
  can_graduate:      boolean;
  last_synced:       string;
}

export interface TradeRow {
  id:           number;
  pool_address: string;
  chain_id:     number;
  tx_hash:      string;
  block_number: string;
  block_time:   string | null;
  trade_type:   "buy" | "sell";
  trader:       string;
  eth_amount:   string;
  token_amount: string;
  fee_amount:   string;
  price_wei:    string;
}

export interface SyncStateRow {
  chain_id:        number;
  factory_address: string;
  last_block:      string;
  last_synced:     string;
}
