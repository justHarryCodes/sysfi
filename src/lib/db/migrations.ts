/**
 * SQL migrations — each entry runs exactly once.
 * New migrations must be APPENDED to the end; never reorder or edit existing ones.
 *
 * The migrations table is created first and tracks which have run.
 * Migrations are idempotent (IF NOT EXISTS, etc.) as a safety net.
 */

export interface Migration {
  id:   number;
  name: string;
  sql:  string;
}

export const MIGRATIONS: Migration[] = [
  // ── 001: bootstrap ──────────────────────────────────────────────────────────
  {
    id:   1,
    name: "create_migrations_table",
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id         INTEGER PRIMARY KEY,
        name       TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },

  // ── 002: core token registry ────────────────────────────────────────────────
  {
    id:   2,
    name: "create_tokens_table",
    sql: `
      CREATE TABLE IF NOT EXISTS tokens (
        id              SERIAL PRIMARY KEY,
        pool_address    TEXT        NOT NULL,
        token_address   TEXT        NOT NULL,
        creator_address TEXT        NOT NULL,
        chain_id        INTEGER     NOT NULL,
        name            TEXT,
        symbol          TEXT,
        created_at_block BIGINT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT tokens_pool_chain_unique UNIQUE (pool_address, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_chain_id  ON tokens (chain_id);
      CREATE INDEX IF NOT EXISTS idx_tokens_creator   ON tokens (creator_address);
      CREATE INDEX IF NOT EXISTS idx_tokens_created   ON tokens (created_at DESC);
    `,
  },

  // ── 003: pool live metrics (updated by sync) ─────────────────────────────────
  {
    id:   3,
    name: "create_pool_stats_table",
    sql: `
      CREATE TABLE IF NOT EXISTS pool_stats (
        id                SERIAL PRIMARY KEY,
        pool_address      TEXT        NOT NULL,
        chain_id          INTEGER     NOT NULL,
        virtual_eth       NUMERIC(78) NOT NULL DEFAULT 0,
        pool_eth          NUMERIC(78) NOT NULL DEFAULT 0,
        fees_eth          NUMERIC(78) NOT NULL DEFAULT 0,
        locked_tokens     NUMERIC(78) NOT NULL DEFAULT 0,
        lock_release_time BIGINT,
        price_wei         NUMERIC(78) NOT NULL DEFAULT 0,
        graduated         BOOLEAN     NOT NULL DEFAULT FALSE,
        can_graduate      BOOLEAN     NOT NULL DEFAULT FALSE,
        last_synced       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pool_stats_unique UNIQUE (pool_address, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_pool_stats_chain ON pool_stats (chain_id);
      CREATE INDEX IF NOT EXISTS idx_pool_stats_graduated ON pool_stats (graduated);
    `,
  },

  // ── 004: trade history ────────────────────────────────────────────────────────
  {
    id:   4,
    name: "create_trades_table",
    sql: `
      CREATE TABLE IF NOT EXISTS trades (
        id           SERIAL PRIMARY KEY,
        pool_address TEXT        NOT NULL,
        chain_id     INTEGER     NOT NULL,
        tx_hash      TEXT        NOT NULL,
        block_number BIGINT      NOT NULL,
        block_time   TIMESTAMPTZ,
        trade_type   TEXT        NOT NULL CHECK (trade_type IN ('buy','sell')),
        trader       TEXT        NOT NULL,
        eth_amount   NUMERIC(78) NOT NULL DEFAULT 0,
        token_amount NUMERIC(78) NOT NULL DEFAULT 0,
        fee_amount   NUMERIC(78) NOT NULL DEFAULT 0,
        price_wei    NUMERIC(78) NOT NULL DEFAULT 0,
        CONSTRAINT trades_tx_chain_unique UNIQUE (tx_hash, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_trades_pool    ON trades (pool_address, chain_id);
      CREATE INDEX IF NOT EXISTS idx_trades_trader  ON trades (trader);
      CREATE INDEX IF NOT EXISTS idx_trades_block   ON trades (block_number DESC);
    `,
  },

  // ── 005: per-chain sync cursor ───────────────────────────────────────────────
  {
    id:   5,
    name: "create_sync_state_table",
    sql: `
      CREATE TABLE IF NOT EXISTS sync_state (
        chain_id        INTEGER     PRIMARY KEY,
        factory_address TEXT        NOT NULL DEFAULT '',
        last_block      BIGINT      NOT NULL DEFAULT 0,
        last_synced     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },

  // ── 006: full-text search on token name / symbol ─────────────────────────────
  {
    id:   6,
    name: "add_token_search_index",
    sql: `
      ALTER TABLE tokens
        ADD COLUMN IF NOT EXISTS search_vector tsvector
          GENERATED ALWAYS AS (
            to_tsvector('english', coalesce(name,'') || ' ' || coalesce(symbol,''))
          ) STORED;
      CREATE INDEX IF NOT EXISTS idx_tokens_search
        ON tokens USING GIN (search_vector);
    `,
  },
];
