#!/usr/bin/env node
/**
 * Migration runner — executed automatically before `dev` and `start`.
 *
 * Run manually:  node scripts/migrate.js
 * Or via npm:    npm run migrate
 *
 * Reads POSTGRES_URL from .env.local (or process.env).
 * Applies any unapplied migrations from src/lib/db/migrations.ts.
 */

"use strict";

const path = require("path");
const fs   = require("fs");

// ── Load .env.local manually (no dotenv dependency needed) ───────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.warn(
    "\n⚠  POSTGRES_URL not set — skipping migrations.\n" +
    "   Add POSTGRES_URL to .env.local to enable the PostgreSQL data layer.\n"
  );
  process.exit(0);
}

// ── Inline migrations (must match src/lib/db/migrations.ts) ─────────────────
// We duplicate them here as plain JS strings so this script runs without
// ts-node or any TypeScript compilation step.

const MIGRATIONS = [
  {
    id: 1, name: "create_migrations_table",
    sql: `CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
  {
    id: 2, name: "create_tokens_table",
    sql: `
      CREATE TABLE IF NOT EXISTS tokens (
        id              SERIAL PRIMARY KEY,
        pool_address    TEXT NOT NULL,
        token_address   TEXT NOT NULL,
        creator_address TEXT NOT NULL,
        chain_id        INTEGER NOT NULL,
        name            TEXT,
        symbol          TEXT,
        created_at_block BIGINT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT tokens_pool_chain_unique UNIQUE (pool_address, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON tokens (chain_id);
      CREATE INDEX IF NOT EXISTS idx_tokens_creator  ON tokens (creator_address);
      CREATE INDEX IF NOT EXISTS idx_tokens_created  ON tokens (created_at DESC);
    `,
  },
  {
    id: 3, name: "create_pool_stats_table",
    sql: `
      CREATE TABLE IF NOT EXISTS pool_stats (
        id                SERIAL PRIMARY KEY,
        pool_address      TEXT NOT NULL,
        chain_id          INTEGER NOT NULL,
        virtual_eth       NUMERIC(78) NOT NULL DEFAULT 0,
        pool_eth          NUMERIC(78) NOT NULL DEFAULT 0,
        fees_eth          NUMERIC(78) NOT NULL DEFAULT 0,
        locked_tokens     NUMERIC(78) NOT NULL DEFAULT 0,
        lock_release_time BIGINT,
        price_wei         NUMERIC(78) NOT NULL DEFAULT 0,
        graduated         BOOLEAN NOT NULL DEFAULT FALSE,
        can_graduate      BOOLEAN NOT NULL DEFAULT FALSE,
        last_synced       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT pool_stats_unique UNIQUE (pool_address, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_pool_stats_chain     ON pool_stats (chain_id);
      CREATE INDEX IF NOT EXISTS idx_pool_stats_graduated ON pool_stats (graduated);
    `,
  },
  {
    id: 4, name: "create_trades_table",
    sql: `
      CREATE TABLE IF NOT EXISTS trades (
        id           SERIAL PRIMARY KEY,
        pool_address TEXT NOT NULL,
        chain_id     INTEGER NOT NULL,
        tx_hash      TEXT NOT NULL,
        block_number BIGINT NOT NULL,
        block_time   TIMESTAMPTZ,
        trade_type   TEXT NOT NULL CHECK (trade_type IN ('buy','sell')),
        trader       TEXT NOT NULL,
        eth_amount   NUMERIC(78) NOT NULL DEFAULT 0,
        token_amount NUMERIC(78) NOT NULL DEFAULT 0,
        fee_amount   NUMERIC(78) NOT NULL DEFAULT 0,
        price_wei    NUMERIC(78) NOT NULL DEFAULT 0,
        CONSTRAINT trades_tx_chain_unique UNIQUE (tx_hash, chain_id)
      );
      CREATE INDEX IF NOT EXISTS idx_trades_pool  ON trades (pool_address, chain_id);
      CREATE INDEX IF NOT EXISTS idx_trades_block ON trades (block_number DESC);
    `,
  },
  {
    id: 5, name: "create_sync_state_table",
    sql: `
      CREATE TABLE IF NOT EXISTS sync_state (
        chain_id        INTEGER PRIMARY KEY,
        factory_address TEXT NOT NULL DEFAULT '',
        last_block      BIGINT NOT NULL DEFAULT 0,
        last_synced     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    id: 6, name: "add_token_search_index",
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

// ── Run ───────────────────────────────────────────────────────────────────────
async function run() {
  const { Pool } = require("pg");
  const pool = new Pool({ connectionString: POSTGRES_URL, ssl: POSTGRES_URL.includes("localhost") ? false : { rejectUnauthorized: false } });
  const client = await pool.connect();

  try {
    console.log("🗄  Running database migrations…");

    // Ensure migrations table exists (migration 001 is idempotent)
    await client.query(MIGRATIONS[0].sql);

    // Get already-applied IDs
    const { rows } = await client.query("SELECT id FROM migrations ORDER BY id");
    const applied  = new Set(rows.map(r => r.id));

    let count = 0;
    for (const m of MIGRATIONS) {
      if (applied.has(m.id)) continue;

      process.stdout.write(`   [${m.id.toString().padStart(3, "0")}] ${m.name} … `);
      await client.query("BEGIN");
      try {
        await client.query(m.sql);
        await client.query(
          "INSERT INTO migrations (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [m.id, m.name]
        );
        await client.query("COMMIT");
        console.log("✓");
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    if (count === 0) {
      console.log("   All migrations already applied.");
    } else {
      console.log(`✅  Applied ${count} migration(s).\n`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error("\n❌  Migration failed:", err.message || err);
  // Don't crash the dev server on migration failure — just warn
  process.exit(0);
});
