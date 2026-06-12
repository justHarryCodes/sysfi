/**
 * Token lists for each supported swap chain.
 * Loaded server-side at runtime from tokenlist/tokens/*.json at the project root.
 */

import fs from "fs";
import path from "path";

export interface SwapToken {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  isNative?: boolean;
  isWrappedNative?: boolean;
}

const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export const NATIVE_TOKENS: Record<number, SwapToken> = {
  1: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 1, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  10: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 10, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  56: {
    name: "BNB", symbol: "BNB", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 56, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png",
  },
  137: {
    name: "POL", symbol: "POL", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 137, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },
  324: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 324, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  480: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 480, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  1301: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 1301, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  8453: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 8453, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  42161: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 42161, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  42220: {
    name: "Celo", symbol: "CELO", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 42220, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/info/logo.png",
  },
  43114: {
    name: "Avalanche", symbol: "AVAX", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 43114, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  },
  81457: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 81457, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  7777777: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 7777777, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  11155111: {
    name: "Ether", symbol: "ETH", address: NATIVE_TOKEN_ADDRESS,
    decimals: 18, chainId: 11155111, isNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
};

export const WRAPPED_NATIVE_TOKENS: Record<number, SwapToken> = {
  1: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18, chainId: 1, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  10: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18, chainId: 10, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  56: {
    name: "Wrapped BNB", symbol: "WBNB",
    address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    decimals: 18, chainId: 56, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c/logo.png",
  },
  137: {
    name: "Wrapped POL", symbol: "WPOL",
    address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    decimals: 18, chainId: 137, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/assets/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270/logo.png",
  },
  324: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    decimals: 18, chainId: 324, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  480: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18, chainId: 480, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  1301: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18, chainId: 1301, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  8453: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18, chainId: 8453, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  42161: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    decimals: 18, chainId: 42161, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  42220: {
    name: "Wrapped Celo", symbol: "WCELO",
    address: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    decimals: 18, chainId: 42220, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/info/logo.png",
  },
  43114: {
    name: "Wrapped AVAX", symbol: "WAVAX",
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    decimals: 18, chainId: 43114, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/assets/0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7/logo.png",
  },
  81457: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4300000000000000000000000000000000000004",
    decimals: 18, chainId: 81457, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  7777777: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0x4200000000000000000000000000000000000006",
    decimals: 18, chainId: 7777777, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
  11155111: {
    name: "Wrapped Ether", symbol: "WETH",
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    decimals: 18, chainId: 11155111, isWrappedNative: true,
    logoURI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png",
  },
};

const MANAGED_WRAPPED = new Set(
  Object.values(WRAPPED_NATIVE_TOKENS).map((t) => t.address.toLowerCase()),
);

const CHAIN_TO_FILE: Record<number, string> = {
  1:        "mainnet",
  10:       "optimism",
  56:       "bnb",
  137:      "polygon",
  196:      "xlayer",
  324:      "zksync",
  480:      "worldchain",
  1301:     "unichain",
  5:        "goerli",
  42:       "kovan",
  4:        "rinkeby",
  3:        "ropsten",
  8453:     "base",
  42161:    "arbitrum",
  42220:    "celo",
  43114:    "avalanche",
  80001:    "mumbai",
  81457:    "blast",
  7777777:  "zora",
  11155111: "sepolia",
};

function loadTokens(chainId: number): SwapToken[] {
  const fileName = CHAIN_TO_FILE[chainId];
  if (!fileName) return [];
  try {
    const filePath = path.join(process.cwd(), "tokenlist", "tokens", `${fileName}.json`);
    const raw = fs.readFileSync(filePath, "utf8");
    const list = JSON.parse(raw) as SwapToken[];
    return list.filter((t) => !MANAGED_WRAPPED.has(t.address.toLowerCase()));
  } catch {
    return [];
  }
}

export function getTokenList(chainId: number, search?: string): SwapToken[] {
  const erc20s  = loadTokens(chainId);
  const native  = NATIVE_TOKENS[chainId];
  const wrapped = WRAPPED_NATIVE_TOKENS[chainId];

  let tokens: SwapToken[] = [
    ...(native  ? [native]  : []),
    ...(wrapped ? [wrapped] : []),
    ...erc20s,
  ];

  if (search) {
    const q = search.toLowerCase().trim();
    tokens = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase() === q,
    );
  }

  return tokens;
}

export function normalizeTokenAddress(addr: string): string {
  if (!addr || addr.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase()) {
    return NATIVE_TOKEN_ADDRESS;
  }
  return addr;
}

/** All chain IDs we have token lists for (excluding deprecated testnets). */
export const SWAP_SUPPORTED_CHAIN_IDS = [
  1, 10, 56, 137, 324, 480, 8453, 42161, 42220, 43114, 81457, 7777777, 11155111,
];
