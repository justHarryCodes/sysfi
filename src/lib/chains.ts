/**
 * Multi-chain configuration for Token Launchpad.
 *
 * Put chain logos inside:
 * /public/chains/
 *
 * Example:
 * /public/chains/base.png
 * /public/chains/bsc.png
 */

import {
  baseSepolia,
  base,
  bsc,
  avalanche,
  arbitrum,
  polygon,
  optimism,
  type Chain,
} from "wagmi/chains";
import { http, type Transport } from "wagmi";

// ─── Contract addresses per chain ─────────────────────────────────────────────

export interface ChainContracts {
  TOKEN_IMPLEMENTATION: `0x${string}`;
  POOL_IMPLEMENTATION: `0x${string}`;
  TOKEN_FACTORY: `0x${string}`;
}

const ZERO = "0x0000000000000000000000000000000000000000" as `0x${string}`;

const CONTRACTS: Record<number, ChainContracts> = {
  [baseSepolia.id]: {
    TOKEN_IMPLEMENTATION: "0xEb9e7d3df9F108f18eCC77a3e2b5E866d5D0fEc2",
    POOL_IMPLEMENTATION: "0xBa9B08F0C2e3C149527ac3C72910808FE652584c",
    TOKEN_FACTORY: "0x56224F508E4D7A8e61EB94e1178f08c74e9A3230",
  },

  [base.id]: {
    TOKEN_IMPLEMENTATION: "0x978ba6000ab33fccA6392ff1d3648685833769Ac",
    POOL_IMPLEMENTATION: "0x8683F31966f3f42799B45afE4199c8D6632bA3C8",
    TOKEN_FACTORY: "0x3c17F73cFCcB8762462683d040F4F4eb6d71Bf6E",
  },
  [bsc.id]: {
    TOKEN_IMPLEMENTATION: ZERO,
    POOL_IMPLEMENTATION: ZERO,
    TOKEN_FACTORY: ZERO,
  },
  [avalanche.id]: {
    TOKEN_IMPLEMENTATION: ZERO,
    POOL_IMPLEMENTATION: ZERO,
    TOKEN_FACTORY: ZERO,
  },
  [arbitrum.id]: {
    TOKEN_IMPLEMENTATION: ZERO,
    POOL_IMPLEMENTATION: ZERO,
    TOKEN_FACTORY: ZERO,
  },
  [polygon.id]: {
    TOKEN_IMPLEMENTATION: ZERO,
    POOL_IMPLEMENTATION: ZERO,
    TOKEN_FACTORY: ZERO,
  },
  [optimism.id]: {
    TOKEN_IMPLEMENTATION: ZERO,
    POOL_IMPLEMENTATION: ZERO,
    TOKEN_FACTORY: ZERO,
  },
};

// ─── Visual + explorer metadata ───────────────────────────────────────────────

export interface ChainMeta {
  chain: Chain;
  rpc: string;
  explorerUrl: string;
  explorerName: string;
  color: string;
  bgColor: string;
  iconSrc: string; // image path for next/image
  isTestnet: boolean;
  nativeCurrencyLabel: string;
}

export const CHAIN_META: Record<number, ChainMeta> = {
  [baseSepolia.id]: {
    chain: baseSepolia,
    rpc: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA ?? "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    explorerName: "BaseScan Sepolia",
    color: "#00d4ff",
    bgColor: "rgba(0,212,255,0.1)",
    iconSrc: "/base.png",
    isTestnet: true,
    nativeCurrencyLabel: "ETH",
  },

  [base.id]: {
    chain: base,
    rpc: process.env.NEXT_PUBLIC_RPC_BASE ?? "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    explorerName: "BaseScan",
    color: "#0052ff",
    bgColor: "rgba(0,82,255,0.12)",
    iconSrc: "/base.png",
    isTestnet: false,
    nativeCurrencyLabel: "ETH",
  },

  [bsc.id]: {
    chain: bsc,
    rpc: process.env.NEXT_PUBLIC_RPC_BSC ?? "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    explorerName: "BscScan",
    color: "#f3ba2f",
    bgColor: "rgba(243,186,47,0.1)",
    iconSrc: "/bnb.png",
    isTestnet: false,
    nativeCurrencyLabel: "BNB",
  },

  [avalanche.id]: {
    chain: avalanche,
    rpc:
      process.env.NEXT_PUBLIC_RPC_AVALANCHE ??
      "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    explorerName: "SnowTrace",
    color: "#e84142",
    bgColor: "rgba(232,65,66,0.1)",
    iconSrc: "/avax.png",
    isTestnet: false,
    nativeCurrencyLabel: "AVAX",
  },

  [arbitrum.id]: {
    chain: arbitrum,
    rpc: process.env.NEXT_PUBLIC_RPC_ARBITRUM ?? "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    explorerName: "Arbiscan",
    color: "#28a0f0",
    bgColor: "rgba(40,160,240,0.1)",
    iconSrc: "/arbitrum.png",
    isTestnet: false,
    nativeCurrencyLabel: "ETH",
  },

  [polygon.id]: {
    chain: polygon,
    rpc: process.env.NEXT_PUBLIC_RPC_POLYGON ?? "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    explorerName: "PolygonScan",
    color: "#8247e5",
    bgColor: "rgba(130,71,229,0.1)",
    iconSrc: "/polygon.png",
    isTestnet: false,
    nativeCurrencyLabel: "POL",
  },

  [optimism.id]: {
    chain: optimism,
    rpc: process.env.NEXT_PUBLIC_RPC_OPTIMISM ?? "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    explorerName: "Optimism Explorer",
    color: "#ff0420",
    bgColor: "rgba(255,4,32,0.1)",
    iconSrc: "/opt.png",
    isTestnet: false,
    nativeCurrencyLabel: "ETH",
  },
};

// ─── Ordered list ─────────────────────────────────────────────────────────────

export const SUPPORTED_CHAIN_IDS = [
  // baseSepolia.id,
  base.id,
  // bsc.id,
  // avalanche.id,
  // arbitrum.id,
  // polygon.id,
  // optimism.id,
];

export const SUPPORTED_CHAINS: Chain[] = SUPPORTED_CHAIN_IDS.map(
  (id) => CHAIN_META[id].chain,
) as Chain[];

// ─── wagmi transports ─────────────────────────────────────────────────────────

export const TRANSPORTS: Record<number, Transport> = Object.fromEntries(
  SUPPORTED_CHAIN_IDS.map((id) => [id, http(CHAIN_META[id].rpc)]),
);

// ─── Contract helpers ─────────────────────────────────────────────────────────

export function getContracts(chainId: number): ChainContracts {
  return (
    CONTRACTS[chainId] ?? {
      TOKEN_IMPLEMENTATION: ZERO,
      POOL_IMPLEMENTATION: ZERO,
      TOKEN_FACTORY: ZERO,
    }
  );
}

export function getChainMeta(chainId: number): ChainMeta {
  return CHAIN_META[chainId] ?? CHAIN_META[baseSepolia.id];
}

export function getExplorerAddressUrl(
  chainId: number,
  address: string,
): string {
  return `${getChainMeta(chainId).explorerUrl}/address/${address}`;
}

export function getExplorerTxUrl(chainId: number, hash: string): string {
  return `${getChainMeta(chainId).explorerUrl}/tx/${hash}`;
}

// ─── Uniswap / wrapped native ────────────────────────────────────────────────

export const UNI_V3_POSITION_MANAGER: Record<number, `0x${string}`> = {
  [base.id]: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f4",
  [arbitrum.id]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  [polygon.id]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  [optimism.id]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  [bsc.id]: ZERO,
  [avalanche.id]: ZERO,
  [baseSepolia.id]: "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2",
};

export const WRAPPED_NATIVE: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x4200000000000000000000000000000000000006",
  [base.id]: "0x4200000000000000000000000000000000000006",
  // [arbitrum.id]: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  // [optimism.id]: "0x4200000000000000000000000000000000000006",
  // [polygon.id]: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  // [bsc.id]: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  // [avalanche.id]: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
};
