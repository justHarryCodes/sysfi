/**
 * Blockchain service — reads DAO data from the DAOFactory contract using viem.
 * Server-side only (used in API routes / Server Components).
 */

import { createPublicClient, http } from "viem";
import {
  base,
  baseSepolia,
  polygon,
  bsc,
  arbitrum,
  avalanche,
} from "viem/chains";
import {
  DAO_FACTORY_ABI,
  DAO_FACTORY_ADDRESSES,
  GENRE_MAP,
  type DAOInfo,
} from "./dao-contracts";

// ─── Chain config ─────────────────────────────────────────────────────────────

interface ChainConfig {
  id: number;
  name: string;
  chain: Parameters<typeof createPublicClient>[0]["chain"];
  rpcUrl: string;
  explorer: string;
  factoryAddress: `0x${string}` | null;
}

const CHAIN_CONFIGS: ChainConfig[] = [
  {
    id: 8453,
    name: "Base",
    chain: base,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_BASE ?? "https://mainnet.base.org",
    explorer: "https://basescan.org",
    factoryAddress: DAO_FACTORY_ADDRESSES[8453],
  },
  {
    id: 84532,
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    factoryAddress: DAO_FACTORY_ADDRESSES[84532],
  },
];

// ─── Client cache ─────────────────────────────────────────────────────────────

const _clients: Record<number, ReturnType<typeof createPublicClient>> = {};

function getClient(chainId: number) {
  if (_clients[chainId]) return _clients[chainId];
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg) throw new Error(`Chain ${chainId} not configured`);
  _clients[chainId] = createPublicClient({
    chain: cfg.chain as Parameters<typeof createPublicClient>[0]["chain"],
    transport: http(cfg.rpcUrl, { timeout: 10_000, retryCount: 2, retryDelay: 500 }),
  });
  return _clients[chainId];
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDAO(raw: Record<string, unknown>, chainId: number): DAOInfo {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId)!;
  const genreId = Number(raw.genre);
  return {
    daoAddress: (raw.daoAddress as string).toLowerCase(),
    tokenAddress: (raw.tokenAddress as string).toLowerCase(),
    genre: GENRE_MAP[genreId] ?? "OTHER",
    genreId,
    daoName: raw.daoName as string,
    imageUrl: raw.imageUrl as string,
    threshold: (raw.threshold as bigint).toString(),
    quorum: Number(raw.quorum),
    votingPeriodHours: Number(raw.votingPeriodHours),
    timelockPeriodHours: Number(raw.timelockPeriodHours),
    createdAt: Number(raw.createdAt),
    createdAtDate: new Date(Number(raw.createdAt) * 1000).toISOString(),
    chainId,
    chainName: cfg.name,
    explorer: cfg.explorer,
    explorerUrl: `${cfg.explorer}/address/${raw.daoAddress}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchDAOsFromChain(
  chainId: number,
  offset = 0,
  limit = 100,
): Promise<DAOInfo[]> {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg?.factoryAddress) return [];

  try {
    const client = getClient(chainId);
    const daos = await client.readContract({
      address: cfg.factoryAddress,
      abi: DAO_FACTORY_ABI,
      functionName: "getDeployedDAOs",
      args: [BigInt(offset), BigInt(Math.min(limit, 100))],
    });

    return (daos as unknown[]).map((d) =>
      formatDAO(d as Record<string, unknown>, chainId),
    );
  } catch (err) {
    console.error(`fetchDAOsFromChain(${chainId}):`, err);
    return [];
  }
}

export async function getDAOByAddress(
  chainId: number,
  daoAddress: string,
): Promise<DAOInfo | null> {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg?.factoryAddress) return null;

  try {
    const client = getClient(chainId);
    const dao = await client.readContract({
      address: cfg.factoryAddress,
      abi: DAO_FACTORY_ABI,
      functionName: "getDAO",
      args: [daoAddress as `0x${string}`],
    });

    return formatDAO(dao as unknown as Record<string, unknown>, chainId);
  } catch (err) {
    console.error(`getDAOByAddress(${chainId}, ${daoAddress}):`, err);
    return null;
  }
}

export async function getDAOsByGenre(
  chainId: number,
  genreId: number,
  offset = 0,
  limit = 100,
): Promise<DAOInfo[]> {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg?.factoryAddress) return [];

  try {
    const client = getClient(chainId);
    const daos = await client.readContract({
      address: cfg.factoryAddress,
      abi: DAO_FACTORY_ABI,
      functionName: "getDAOsByGenre",
      args: [genreId, BigInt(offset), BigInt(limit)],
    });

    return (daos as unknown[]).map((d) =>
      formatDAO(d as Record<string, unknown>, chainId),
    );
  } catch (err) {
    console.error(`getDAOsByGenre(${chainId}, ${genreId}):`, err);
    return [];
  }
}

export async function getTotalDAOs(chainId: number): Promise<number> {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg?.factoryAddress) return 0;

  try {
    const client = getClient(chainId);
    const total = await client.readContract({
      address: cfg.factoryAddress,
      abi: DAO_FACTORY_ABI,
      functionName: "getTotalDAOs",
    });
    return Number(total);
  } catch {
    return 0;
  }
}

export async function getCreationFees(chainId: number) {
  const cfg = CHAIN_CONFIGS.find((c) => c.id === chainId);
  if (!cfg?.factoryAddress) return { eth: 0n, token: 0n };

  try {
    const client = getClient(chainId);
    const [eth, token] = await Promise.all([
      client.readContract({
        address: cfg.factoryAddress,
        abi: DAO_FACTORY_ABI,
        functionName: "ethDaoCreationFee",
      }),
      client.readContract({
        address: cfg.factoryAddress,
        abi: DAO_FACTORY_ABI,
        functionName: "tokenDaoCreationFee",
      }),
    ]);
    return { eth: eth as bigint, token: token as bigint };
  } catch {
    return { eth: 0n, token: 0n };
  }
}

export function getSupportedChains() {
  return CHAIN_CONFIGS.filter((c) => c.factoryAddress).map((c) => ({
    id: c.id,
    name: c.name,
    explorer: c.explorer,
    factoryAddress: c.factoryAddress,
  }));
}
