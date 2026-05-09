/**
 * Contract ABIs.
 * Addresses are now chain-specific — use getContracts(chainId) from chains.ts.
 */

// ─── TokenFactory ABI ─────────────────────────────────────────────────────────
export const TOKEN_FACTORY_ABI = [
  { name: "createToken",        type: "function", stateMutability: "payable",    inputs: [{ name: "name", type: "string" }, { name: "symbol", type: "string" }], outputs: [] },
  { name: "graduatePool",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "poolAddr", type: "address" }, { name: "slippageBps", type: "uint256" }], outputs: [] },
  { name: "withdrawFees",       type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "claimRefund",        type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "creationFee",        type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "totalTokens",        type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getTokenInfo",       type: "function", stateMutability: "view",       inputs: [{ name: "index", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "token", type: "address" }, { name: "pool", type: "address" }, { name: "creator", type: "address" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "getTokensPaginated", type: "function", stateMutability: "view",       inputs: [{ name: "start", type: "uint256" }, { name: "count", type: "uint256" }], outputs: [{ name: "infos", type: "tuple[]", components: [{ name: "token", type: "address" }, { name: "pool", type: "address" }, { name: "creator", type: "address" }, { name: "createdAt", type: "uint256" }] }] },
  { name: "canGraduate",        type: "function", stateMutability: "view",       inputs: [{ name: "poolAddr", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "isPool",             type: "function", stateMutability: "view",       inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "poolByToken",        type: "function", stateMutability: "view",       inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "address" }] },
  { name: "collectedFees",      type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "pendingRefunds",     type: "function", stateMutability: "view",       inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "TokenCreated",       type: "event", inputs: [{ name: "token", type: "address", indexed: true }, { name: "pool", type: "address", indexed: true }, { name: "creator", type: "address", indexed: true }, { name: "name", type: "string", indexed: false }, { name: "symbol", type: "string", indexed: false }, { name: "creationFee", type: "uint256", indexed: false }] },
  { name: "PoolGraduated",      type: "event", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "token", type: "address", indexed: true }] },
] as const;

// ─── LaunchPool ABI ───────────────────────────────────────────────────────────
export const LAUNCH_POOL_ABI = [
  { name: "buy",              type: "function", stateMutability: "payable",    inputs: [{ name: "minTokensOut", type: "uint256" }], outputs: [] },
  { name: "sell",             type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenAmount", type: "uint256" }, { name: "minETHOut", type: "uint256" }], outputs: [] },
  { name: "claimLockedTokens",type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "claimFees",        type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "currentPrice",     type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "quoteBuy",         type: "function", stateMutability: "view",       inputs: [{ name: "ethIn", type: "uint256" }], outputs: [{ name: "tokensOut", type: "uint256" }, { name: "fee", type: "uint256" }] },
  { name: "quoteSell",        type: "function", stateMutability: "view",       inputs: [{ name: "tokenIn", type: "uint256" }], outputs: [{ name: "ethOut", type: "uint256" }, { name: "fee", type: "uint256" }] },
  { name: "poolInfo",         type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "_virtualETH", type: "uint256" }, { name: "_virtualTokenReserve", type: "uint256" }, { name: "_poolETH", type: "uint256" }, { name: "_feesETH", type: "uint256" }, { name: "_lockedTokens", type: "uint256" }, { name: "_lockReleaseTime", type: "uint256" }, { name: "_currentPriceWei", type: "uint256" }, { name: "_initialized", type: "bool" }, { name: "_graduated", type: "bool" }, { name: "_canGraduate", type: "bool" }] },
  { name: "invariantCheck",   type: "function", stateMutability: "view",       inputs: [], outputs: [{ name: "ok", type: "bool" }, { name: "balance", type: "uint256" }, { name: "owed", type: "uint256" }] },
  { name: "token",            type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "creator",          type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "factory",          type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "virtualETH",      type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "poolETH",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "feesETH",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "lockedTokens",    type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "lockReleaseTime", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "initialized",     type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "graduated",       type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool" }] },
  { name: "GRADUATION_ETH",  type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "TokensBought",    type: "event", inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "ethIn", type: "uint256", indexed: false }, { name: "fee", type: "uint256", indexed: false }, { name: "tokensOut", type: "uint256", indexed: false }, { name: "newVirtualETH", type: "uint256", indexed: false }, { name: "newPrice", type: "uint256", indexed: false }] },
  { name: "TokensSold",      type: "event", inputs: [{ name: "seller", type: "address", indexed: true }, { name: "tokensIn", type: "uint256", indexed: false }, { name: "ethOut", type: "uint256", indexed: false }, { name: "fee", type: "uint256", indexed: false }, { name: "newVirtualETH", type: "uint256", indexed: false }, { name: "newPrice", type: "uint256", indexed: false }] },
  { name: "Graduated",       type: "event", inputs: [{ name: "pool", type: "address", indexed: true }, { name: "uniPool", type: "address", indexed: true }, { name: "ethProvided", type: "uint256", indexed: false }, { name: "tokensProvided", type: "uint256", indexed: false }] },
] as const;

// ─── ERC-20 ABI (minimal) ─────────────────────────────────────────────────────
export const ERC20_ABI = [
  { name: "name",        type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol",      type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals",    type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf",   type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance",   type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "transfer",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
