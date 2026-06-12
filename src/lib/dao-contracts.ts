/**
 * DAO contracts: ABIs, factory addresses, and enums.
 */

// ─── DAO Factory ABI ──────────────────────────────────────────────────────────
export const DAO_FACTORY_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "quorum", type: "uint256" },
      { internalType: "uint256", name: "threshold", type: "uint256" },
      { internalType: "uint256", name: "votingPeriodHours", type: "uint256" },
      { internalType: "uint256", name: "timelockPeriodHours", type: "uint256" },
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "uint8", name: "genre", type: "uint8" },
      { internalType: "string", name: "imgUrl", type: "string" },
      { internalType: "string", name: "daoName", type: "string" },
      { internalType: "uint8", name: "paymentMethod", type: "uint8" },
    ],
    name: "createDAO",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "daoAddr", type: "address" }],
    name: "getDAO",
    outputs: [
      {
        components: [
          { internalType: "address", name: "daoAddress", type: "address" },
          { internalType: "address", name: "tokenAddress", type: "address" },
          { internalType: "uint8", name: "genre", type: "uint8" },
          { internalType: "string", name: "daoName", type: "string" },
          { internalType: "string", name: "imageUrl", type: "string" },
          { internalType: "uint256", name: "threshold", type: "uint256" },
          { internalType: "uint256", name: "quorum", type: "uint256" },
          { internalType: "uint256", name: "votingPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "timelockPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        internalType: "struct DAOFactory.DAOInfo",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "offset", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
    ],
    name: "getDeployedDAOs",
    outputs: [
      {
        components: [
          { internalType: "address", name: "daoAddress", type: "address" },
          { internalType: "address", name: "tokenAddress", type: "address" },
          { internalType: "uint8", name: "genre", type: "uint8" },
          { internalType: "string", name: "daoName", type: "string" },
          { internalType: "string", name: "imageUrl", type: "string" },
          { internalType: "uint256", name: "threshold", type: "uint256" },
          { internalType: "uint256", name: "quorum", type: "uint256" },
          { internalType: "uint256", name: "votingPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "timelockPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        internalType: "struct DAOFactory.DAOInfo[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint8", name: "genre", type: "uint8" },
      { internalType: "uint256", name: "offset", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" },
    ],
    name: "getDAOsByGenre",
    outputs: [
      {
        components: [
          { internalType: "address", name: "daoAddress", type: "address" },
          { internalType: "address", name: "tokenAddress", type: "address" },
          { internalType: "uint8", name: "genre", type: "uint8" },
          { internalType: "string", name: "daoName", type: "string" },
          { internalType: "string", name: "imageUrl", type: "string" },
          { internalType: "uint256", name: "threshold", type: "uint256" },
          { internalType: "uint256", name: "quorum", type: "uint256" },
          { internalType: "uint256", name: "votingPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "timelockPeriodHours", type: "uint256" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
        ],
        internalType: "struct DAOFactory.DAOInfo[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalDAOs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ethDaoCreationFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenDaoCreationFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "daoAddress", type: "address" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "address", name: "tokenAddress", type: "address" },
      { indexed: false, internalType: "uint8", name: "genre", type: "uint8" },
      { indexed: false, internalType: "string", name: "daoName", type: "string" },
      { indexed: false, internalType: "uint8", name: "paymentMethod", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "threshold", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timelockPeriodHours", type: "uint256" },
    ],
    name: "DAOCreated",
    type: "event",
  },
] as const;

// ─── DAO Core ABI (governance / proposals / voting) ───────────────────────────
export const DAO_CORE_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
      { internalType: "address", name: "_recipient", type: "address" },
    ],
    name: "createFundingProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
    ],
    name: "createGenericProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_title", type: "string" },
      { internalType: "string", name: "_description", type: "string" },
      { internalType: "string", name: "_action", type: "string" },
      { internalType: "string", name: "_newValue", type: "string" },
      { internalType: "address", name: "_newTokenAddress", type: "address" },
    ],
    name: "createProtocolUpgradeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_id", type: "uint256" },
      { internalType: "uint8", name: "_option", type: "uint8" },
    ],
    name: "vote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "getProposal",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "string", name: "title", type: "string" },
          { internalType: "string", name: "description", type: "string" },
          { internalType: "uint256", name: "votesFor", type: "uint256" },
          { internalType: "uint256", name: "votesAgainst", type: "uint256" },
          { internalType: "uint256", name: "votesAbstain", type: "uint256" },
          { internalType: "uint256", name: "startTime", type: "uint256" },
          { internalType: "uint256", name: "endTime", type: "uint256" },
          { internalType: "uint256", name: "executionTime", type: "uint256" },
          { internalType: "address", name: "proposer", type: "address" },
          { internalType: "uint8", name: "status", type: "uint8" },
          { internalType: "uint8", name: "proposalType", type: "uint8" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "address", name: "recipient", type: "address" },
        ],
        internalType: "struct DelegatedDAO.Proposal",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "canExecute",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "executeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "finalizeProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_id", type: "uint256" }],
    name: "cancelProposal",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_delegatee", type: "address" }],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "undelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "delegatorDelegatee",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "delegateeVotesReceived",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint256", name: "", type: "uint256" },
    ],
    name: "hasVotedIndependently",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "quorumPercentage",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "proposalThreshold",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "votingPeriodHours",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "imageUrl",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "id", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "address", name: "recipient", type: "address" },
      { indexed: false, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "description", type: "string" },
    ],
    name: "ProposalCreated",
    type: "event",
  },
] as const;

// ─── Genre mapping ─────────────────────────────────────────────────────────────
export const GENRE_MAP: Record<number, string> = {
  0: "NFT",
  1: "GAMING",
  2: "COMMUNITY",
  3: "DEFI",
  4: "AI",
  5: "DEGEN",
  6: "MEMECOIN",
  7: "RWA",
  8: "DEPIN",
  9: "SOCIALFI",
  10: "METAVERSE",
  11: "OTHER",
};

export const GENRE_LABELS = Object.entries(GENRE_MAP).map(([id, name]) => ({
  id: Number(id),
  name,
}));

export const PAYMENT_METHOD_MAP: Record<number, string> = {
  0: "ETH",
  1: "TOKEN",
};

// ─── Factory addresses per chain ───────────────────────────────────────────────
export const DAO_FACTORY_ADDRESSES: Record<number, `0x${string}`> = {
  8453:  "0x69db1Ea748Aa83214c99ab1109fc34eba94734C0", // Base mainnet
  84532: "0x4B3AD106552927494E0DB019170c1E5d4E5D08Eb", // Base Sepolia
  137:   "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B", // Polygon
  42161: "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B", // Arbitrum
  43114: "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B", // Avalanche
  56:    "0x3c181eaaB64052c726194Da6797EA06DD15e8E6B", // BSC
};

export function getDAOFactoryAddress(chainId: number): `0x${string}` | null {
  return DAO_FACTORY_ADDRESSES[chainId] ?? null;
}

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface DAOInfo {
  daoAddress: string;
  tokenAddress: string;
  genre: string;
  genreId: number;
  daoName: string;
  imageUrl: string;
  threshold: string;
  quorum: number;
  votingPeriodHours: number;
  timelockPeriodHours: number;
  createdAt: number;
  createdAtDate: string;
  chainId: number;
  chainName: string;
  explorer: string;
  explorerUrl: string;
  offChain?: {
    description: string;
    website: string | null;
    twitter: string | null;
    discord: string | null;
    telegram: string | null;
    creator: string | null;
    txHash: string | null;
  } | null;
}

export interface ProposalInfo {
  proposalId: number;
  daoAddress: string;
  chainId: number;
  title: string;
  description: string;
  type: "generic" | "funding" | "protocol_upgrade";
  status: "active" | "passed" | "failed" | "executed" | "cancelled";
  proposer: string;
  targetAddress?: string | null;
  amount?: string;
  callData?: string;
  votesFor: string;
  votesAgainst: string;
  votesAbstain: string;
  totalVoters: number;
  startTime: number;
  endTime: number;
  txHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
