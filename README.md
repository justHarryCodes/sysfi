# Token Launchpad — v4 (PostgreSQL + MongoDB + Multi-chain)

## Architecture

```
Browser (React/Next.js)
  │
  ├── /api/tokens        ← PostgreSQL: instant list, paginated, full-text search
  ├── /api/tokens/sync   ← sync blockchain → PG (auto-triggered in background)
  ├── /api/tokens/:pool  ← PostgreSQL: single token + pool_stats
  ├── /api/metadata/*    ← MongoDB: description, social links
  ├── /api/images/*      ← MongoDB: logo + banner (streamed as JPEG)
  │
  └── Direct RPC (wagmi hooks)
        ├── poolInfo()       ← real-time price on token detail page
        ├── quoteBuy/Sell()  ← live AMM quotes in trade panel
        └── buy()/sell()     ← write transactions
```

### Data sources

| Data | Primary | Fallback |
|---|---|---|
| Token list | PostgreSQL | blockchain |
| Pool live metrics | PostgreSQL (refreshed every sync) | blockchain |
| Real-time price | blockchain (wagmi) | PostgreSQL |
| Metadata (description, socials) | MongoDB | — |
| Images (logo, banner) | MongoDB (base64 → streamed JPEG) | — |
| Trades / chart | PostgreSQL | blockchain events |

---

## Quick start

```bash
npm install    # also runs migrations automatically
npm run dev
```

---

## Setup checklist

### 1 — PostgreSQL (for fast loads)

Any provider works: Supabase, Neon, Railway, self-hosted.

```
POSTGRES_URL=postgresql://user:password@host:5432/launchpad
```

Migrations run automatically on `npm run dev` and `npm start`.
They are idempotent — safe to run multiple times.

Manually: `npm run migrate`

### 2 — MongoDB (for images + metadata)

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/launchpad
```

### 3 — Deploy contracts per chain, fill addresses in `src/lib/chains.ts`

```ts
const CONTRACTS: Record<number, ChainContracts> = {
  [baseSepolia.id]: {
    TOKEN_IMPLEMENTATION: "0x...",
    POOL_IMPLEMENTATION:  "0x...",
    TOKEN_FACTORY:        "0x...",
  },
  // etc.
};
```

### 4 — WalletConnect

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
```

---

## PostgreSQL schema

```
migrations     – tracks which migrations have run
tokens         – one row per (pool_address, chain_id); name, symbol, addresses
pool_stats     – live metrics: price, poolETH, graduated, etc. (updated each sync)
trades         – buy/sell events: block, trader, amounts (feeds the price chart)
sync_state     – last synced block per chain (used for incremental sync)
```

---

## Sync behaviour

1. `npm run dev` starts → migrations run → app is ready.
2. First `/api/tokens?chainId=X` request → background `POST /api/tokens/sync?chainId=X` fires.
3. Sync reads from `sync_state.last_block` to `currentBlock`, indexes `TokenCreated` events.
4. For all non-graduated pools, `poolInfo()` is called and stats are refreshed.
5. `sync_state.last_block` is updated. Next sync starts from there (incremental).
6. Cooldown (default 30 s) prevents hammering RPC on every page load.
7. Override: `SYNC_COOLDOWN_SECONDS=0` for instant re-sync (dev/debug).

Trigger a manual full sync:
```
POST /api/tokens/sync           # all chains
POST /api/tokens/sync?chainId=84532   # one chain
```

---

## API reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/tokens?chainId=&page=&limit=&search=` | Paginated token list from PG |
| GET | `/api/tokens/:pool?chainId=` | Single token + pool stats |
| GET | `/api/tokens/sync?chainId=` | Sync state |
| POST | `/api/tokens/sync?chainId=` | Trigger sync |
| GET | `/api/metadata/:pool?chainId=` | MongoDB metadata |
| POST | `/api/metadata` | Upsert metadata |
| GET | `/api/images/:pool?chainId=&type=logo\|banner` | Serve stored image |

---

## Supported chains

| Chain | ID | Native | Status |
|---|---|---|---|
| Base Sepolia (testnet) | 84532 | ETH | ✅ Ready |
| Base | 8453 | ETH | Deploy contracts |
| BNB Smart Chain | 56 | BNB | Deploy contracts |
| Avalanche C-Chain | 43114 | AVAX | Deploy contracts |
| Arbitrum One | 42161 | ETH | Deploy contracts |
| Polygon | 137 | POL | Deploy contracts |
| Optimism | 10 | ETH | Deploy contracts |
