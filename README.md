# SysFi: Token Launchpad, DEX and DAO Platform

Launch and trade tokens on a **bonding curve**. When a token's pool reaches **10 ETH** it automatically graduates to Uniswap V3 liquidity. SysFi also includes swaps, DAO governance, community guilds and a SYN → WSYN bridge, across several EVM chains.

## Features

- **Launch:** create a token with a logo, banner, description and social links, and trade it immediately on its bonding-curve pool
- **Trade:** live AMM buy and sell quotes, price charts (TradingView lightweight-charts) and trade history for every token
- **Graduation:** pools migrate to Uniswap V3 once they hit the threshold
- **Swap:** aggregated swaps through the 0x API
- **DAOs:** create a DAO, publish proposals and vote on-chain, with a directory for each chain
- **Guilds and feed:** community guilds and an activity feed
- **Bridge:** convert native SYN to the ERC-20 **WSYN** ([`contracts/WSYN.sol`](contracts/WSYN.sol)) through signed mint vouchers
- **Portfolio:** holdings and positions across launched tokens
- **Token lists:** exports Uniswap-standard token lists for each chain (`npm run export-tokenlist`)
- **Admin panel and PWA support**

## Tech stack

| Layer | Technology |
|---|---|
| App | Next.js (App Router), React, TypeScript, Tailwind CSS, Framer Motion |
| Wallets | wagmi, viem, ethers, RainbowKit |
| Indexing | PostgreSQL for tokens, pool stats, trades and sync state, with incremental block sync |
| Content | MongoDB for metadata, images, DAOs and guilds; Cloudinary for media |
| Auth / misc | Firebase Admin, Supabase |
| Charts | lightweight-charts, Recharts |

## Environment variables

| Group | Variables |
|---|---|
| Databases | `POSTGRES_URL`, `MONGODB_URI`, `MONGODB_DB_NAME` |
| RPC | `NEXT_PUBLIC_RPC_BASE`, `…_BASE_SEPOLIA`, `…_BSC`, `…_ARBITRUM`, `…_AVALANCHE`, `…_OPTIMISM`, `…_POLYGON` |
| Wallets | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` |
| Swap | `ZERO_EX_API_KEY` |
| Bridge | `NEXT_PUBLIC_WSYN_CONTRACT_ADDRESS`, `WSYN_CONTRACT_ADDRESS_MAINNET`, `VOUCHER_SIGNER_KEY` (server-only) |
| Media | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` |
| Firebase / Supabase | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Sync tuning | `SYNC_COOLDOWN_SECONDS`, `SYNC_BLOCKS_PER_PASS` |

## Project structure

```
src/
├── app/            # /, launch, token/[address], swap, dao, bridge, portfolio, admin + api/
├── components/  context/  hooks/  providers/
└── lib/            # chains, contracts, Postgres / Mongo clients, DAO and guild services
contracts/WSYN.sol  # Wrapped SYN (ERC-20 + permit, voucher minting)
scripts/            # DB migrations, token-list export
tokenlist/          # Per-chain token list sources and builder
```

---

## Technical reference

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
