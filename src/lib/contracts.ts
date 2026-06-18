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

// ─── WSYN ABI (Wrapped SYN — voucher-minted ERC20) ───────────────────────────
export const WSYN_ABI = [
  // ── ERC20 core ──
  { name: "name",         type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol",       type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals",     type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply",  type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf",    type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance",    type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",      type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "transfer",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "transferFrom", type: "function", stateMutability: "nonpayable", inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  // ── ERC20Burnable ──
  { name: "burn",         type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "burnFrom",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "account", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  // ── ERC20Permit ──
  { name: "permit",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }, { name: "value", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "v", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" }], outputs: [] },
  { name: "nonces",       type: "function", stateMutability: "view",       inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "DOMAIN_SEPARATOR", type: "function", stateMutability: "view",  inputs: [], outputs: [{ type: "bytes32" }] },
  // ── WSYN-specific ──
  { name: "mintWithVoucher", type: "function", stateMutability: "payable",
    inputs: [
      { name: "recipient",  type: "address" },
      { name: "amount",     type: "uint256" },
      { name: "nonce",      type: "bytes32" },
      { name: "validFrom",  type: "uint256" },
      { name: "validUntil", type: "uint256" },
      { name: "sig",        type: "bytes"   },
    ],
    outputs: [],
  },
  { name: "signer",       type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "address" }] },
  { name: "mintFee",      type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "mintedPerUser",type: "function", stateMutability: "view",       inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "usedNonces",   type: "function", stateMutability: "view",       inputs: [{ name: "nonce", type: "bytes32" }], outputs: [{ type: "bool" }] },
  { name: "MAX_SUPPLY",   type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MAX_PER_USER", type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "MAX_PER_TX",   type: "function", stateMutability: "view",       inputs: [], outputs: [{ type: "uint256" }] },
  { name: "setSigner",    type: "function", stateMutability: "nonpayable", inputs: [{ name: "_signer", type: "address" }], outputs: [] },
  { name: "setMintFee",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "_fee", type: "uint256" }], outputs: [] },
  { name: "withdrawFees", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "recoverTokens",type: "function", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  // ── Events ──
  { name: "TokensMinted", type: "event", inputs: [{ name: "recipient", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "nonce", type: "bytes32", indexed: true }] },
  { name: "Transfer",     type: "event", inputs: [{ name: "from",  type: "address", indexed: true }, { name: "to",     type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { name: "Approval",     type: "event", inputs: [{ name: "owner", type: "address", indexed: true }, { name: "spender", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
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
