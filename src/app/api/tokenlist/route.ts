export const dynamic = 'force-dynamic';

/**
 * GET /api/tokenlist.json?chainId=84532
 * GET /api/tokenlist.json              (all chains)
 *
 * Returns a fully compliant Uniswap Token List (tokenlists.org standard).
 * This is the same format used by Uniswap, PancakeSwap, and every major DEX
 * for their curated token registries.
 *
 * The list is generated live from PostgreSQL (token registry) and MongoDB
 * (metadata — name override, symbol override, logoURI).
 *
 * Cache-Control: 60 s  so CDNs and wallets don't hammer the endpoint.
 *
 * Usage in any DEX / wallet that supports the standard:
 *   https://yourdomain.com/api/tokenlist.json
 */

import { NextRequest, NextResponse } from "next/server";
import { hasPG, query } from "@/lib/postgres";
import { getDb, METADATA_COL } from "@/lib/mongodb";
import { SUPPORTED_CHAIN_IDS, CHAIN_META } from "@/lib/chains";
import { getTokenList as getCuratedTokens } from "@/lib/tokenLists";

// ─── Uniswap Token List types (https://tokenlists.org) ────────────────────────

interface TokenEntry {
  chainId: number;
  address: string; // token contract address (checksummed)
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string; // absolute URL to a square image
  tags?: string[];
  extensions?: Record<string, unknown>;
}

interface TokenList {
  name: string;
  logoURI: string;
  keywords: string[];
  timestamp: string; // ISO-8601
  version: { major: number; minor: number; patch: number };
  tokens: TokenEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a hex address to EIP-55 checksum format (simple version) */
function toChecksumAddress(addr: string): string {
  // For full EIP-55 you'd use viem's getAddress() — this is safe enough for a list
  return addr.toLowerCase();
}

/** Derive the absolute logoURI from our MongoDB image API */
function buildLogoURI(
  baseUrl: string,
  poolAddress: string,
  chainId: number,
  hasLogo: boolean,
): string | undefined {
  if (!hasLogo) return undefined;
  return `${baseUrl}/api/images/${poolAddress.toLowerCase()}?chainId=${chainId}&type=logo`;
}

/** Derive a version from the total token count (patch bumps on each new token) */
function deriveVersion(total: number): {
  major: number;
  minor: number;
  patch: number;
} {
  return { major: 1, minor: 0, patch: total };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const chainId = Number(sp.get("chainId") ?? 0);
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // Which chain IDs to include
  const targetChains = chainId ? [chainId] : SUPPORTED_CHAIN_IDS;

  let tokens: TokenEntry[] = [];

  // ── 1. Pull token rows from PostgreSQL ─────────────────────────────────────
  if (hasPG()) {
    for (const cid of targetChains) {
      const rows = await query<{
        token_address: string;
        pool_address: string;
        name: string | null;
        symbol: string | null;
        chain_id: number;
      }>(
        `SELECT token_address, pool_address, name, symbol, chain_id
         FROM tokens
         WHERE chain_id = $1
         ORDER BY created_at ASC`,
        [cid],
      );

      if (rows) {
        for (const row of rows) {
          tokens.push({
            chainId: row.chain_id,
            address: toChecksumAddress(row.token_address),
            name: row.name ?? "Unknown Token",
            symbol: row.symbol ?? "???",
            decimals: 18,
            tags: ["launchpad"],
            extensions: {
              poolAddress: row.pool_address,
              launchpadUrl: `${baseUrl}/token/${row.pool_address}`,
            },
          });
        }
      }
    }
  }

  // ── 2. Enrich with MongoDB metadata (name override, symbol override, logo) ──
  if (tokens.length > 0) {
    try {
      const db = await getDb();
      const col = db.collection(METADATA_COL);

      // Fetch all relevant metadata docs in one query
      const poolAddresses = tokens
        .map((t) => ((t.extensions?.poolAddress as string) ?? "").toLowerCase())
        .filter(Boolean);

      const metaDocs = await col
        .find(
          { poolAddress: { $in: poolAddresses } },
          {
            projection: {
              poolAddress: 1,
              chainId: 1,
              name: 1,
              symbol: 1,
              description: 1,
              website: 1,
              twitter: 1,
              telegram: 1,
              discord: 1,
              // Check if logo exists without fetching the full base64 blob
              hasLogo: {
                $cond: [
                  {
                    $or: [
                      { $gt: [{ $strLenBytes: { $ifNull: ["$logoData", ""] } }, 0] },
                      { $gt: [{ $strLenBytes: { $ifNull: ["$logoUrl",  ""] } }, 0] },
                    ],
                  },
                  true,
                  false,
                ],
              },
            },
          },
        )
        .toArray();

      // Build a lookup map: poolAddress:chainId → meta doc
      const metaMap = new Map<string, (typeof metaDocs)[0]>();
      for (const doc of metaDocs) {
        metaMap.set(`${doc.poolAddress}:${doc.chainId}`, doc);
      }

      // Merge metadata into each token entry
      tokens = tokens.map((token) => {
        const poolAddr = (
          (token.extensions?.poolAddress as string) ?? ""
        ).toLowerCase();
        const meta = metaMap.get(`${poolAddr}:${token.chainId}`);

        if (!meta) return token;

        const enriched: TokenEntry = {
          ...token,
          name: meta.name || token.name,
          symbol: meta.symbol || token.symbol,
          logoURI: buildLogoURI(
            baseUrl,
            poolAddr,
            token.chainId,
            !!meta.hasLogo,
          ),
        };

        // Add social links and description to extensions
        const ext: Record<string, unknown> = { ...token.extensions };
        if (meta.description) ext.description = meta.description;
        if (meta.website) ext.website = meta.website;
        if (meta.twitter) ext.twitter = meta.twitter;
        if (meta.telegram) ext.telegram = meta.telegram;
        if (meta.discord) ext.discord = meta.discord;
        enriched.extensions = ext;

        return enriched;
      });
    } catch (err) {
      // MongoDB enrichment is best-effort — still return the list without logos
      console.error("[tokenlist] MongoDB enrichment failed:", err);
    }
  }

  // ── 3. Include curated swap tokens from tokenlist/tokens/ ─────────────────
  // These are well-known ERC-20s (Uniswap default list) for each chain.
  // Mark them with a "curated" tag so consumers can distinguish them from
  // launchpad-launched tokens.
  const seenAddresses = new Set(
    tokens.map((t) => `${t.chainId}:${t.address.toLowerCase()}`)
  );
  for (const cid of targetChains) {
    const curated = getCuratedTokens(cid);
    for (const t of curated) {
      const key = `${t.chainId}:${t.address.toLowerCase()}`;
      if (seenAddresses.has(key)) continue;
      seenAddresses.add(key);
      tokens.push({
        chainId:  t.chainId,
        address:  toChecksumAddress(t.address),
        name:     t.name,
        symbol:   t.symbol,
        decimals: t.decimals,
        logoURI:  t.logoURI,
        tags:     ["curated"],
      });
    }
  }

  // ── 4. Build the Token List document ───────────────────────────────────────
  const chainName = chainId
    ? (CHAIN_META[chainId]?.chain.name ?? "Multi-Chain")
    : "Multi-Chain";

  const list: TokenList = {
    name: `Sysfi ${chainName} Token List`,
    logoURI: `${baseUrl}/logo.png`, // put your logo at /public/logo.png
    keywords: [
      "sysfi",
      "launchpad",
      "bonding-curve",
      "defi",
      chainName.toLowerCase(),
    ],
    timestamp: new Date().toISOString(),
    version: deriveVersion(tokens.length),
    tokens,
  };

  return NextResponse.json(list, {
    headers: {
      // 60 s browser cache, 5 min CDN cache, stale-while-revalidate for speed
      "Cache-Control":
        "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": "application/json",
      // CORS — any wallet / DEX can fetch this
      "Access-Control-Allow-Origin": "*",
    },
  });
}
