/**
 * MongoDB service for DAO off-chain data:
 * proposals, user votes, DAO activity feed, DAO metadata, proposal chat.
 */

import { getDb } from "./mongodb";
import type { ProposalInfo } from "./dao-contracts";

// ─── Collection accessors ─────────────────────────────────────────────────────

async function col(name: string) {
  const db = await getDb();
  return db.collection(name);
}

// ─── DAO Metadata ─────────────────────────────────────────────────────────────

export interface DAOMetadataDoc {
  daoAddress: string;
  chainId: number;
  txHash: string | null;
  creator: string;
  description: string;
  website: string | null;
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  extra: Record<string, unknown>;
  createdAt?: Date;
  updatedAt: Date;
}

export async function saveDAOMetadata(data: Omit<DAOMetadataDoc, "updatedAt" | "createdAt">) {
  const c = await col("dao_metadata");
  const filter = {
    daoAddress: data.daoAddress.toLowerCase(),
    chainId: data.chainId,
  };
  const doc: DAOMetadataDoc = {
    ...filter,
    txHash: data.txHash ?? null,
    creator: (data.creator ?? "").toLowerCase(),
    description: data.description ?? "",
    website: data.website ?? null,
    twitter: data.twitter ?? null,
    discord: data.discord ?? null,
    telegram: data.telegram ?? null,
    extra: data.extra ?? {},
    updatedAt: new Date(),
  };
  await c.updateOne(
    filter,
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return doc;
}

export async function getDAOMetadata(
  daoAddress: string,
  chainId: number,
): Promise<DAOMetadataDoc | null> {
  const c = await col("dao_metadata");
  return c.findOne({
    daoAddress: daoAddress.toLowerCase(),
    chainId,
  }) as Promise<DAOMetadataDoc | null>;
}

// ─── Proposals ────────────────────────────────────────────────────────────────

export async function upsertProposal(data: Partial<ProposalInfo>) {
  const c = await col("proposals");
  const filter = {
    proposalId: data.proposalId,
    daoAddress: (data.daoAddress ?? "").toLowerCase(),
    chainId: data.chainId,
  };
  const doc = {
    ...filter,
    title: data.title ?? "",
    description: data.description ?? "",
    type: data.type ?? "generic",
    status: data.status ?? "active",
    proposer: (data.proposer ?? "").toLowerCase(),
    targetAddress: data.targetAddress ?? null,
    amount: data.amount ?? "0",
    callData: data.callData ?? "0x",
    votesFor: data.votesFor ?? "0",
    votesAgainst: data.votesAgainst ?? "0",
    votesAbstain: data.votesAbstain ?? "0",
    totalVoters: data.totalVoters ?? 0,
    startTime: data.startTime,
    endTime: data.endTime,
    txHash: data.txHash ?? null,
    updatedAt: new Date(),
  };
  const result = await c.findOneAndUpdate(
    filter,
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, returnDocument: "after" },
  );
  return result;
}

export async function getProposalsByDAO(
  daoAddress: string,
  chainId: number,
  { status, limit = 50, skip = 0 }: { status?: string; limit?: number; skip?: number } = {},
) {
  const c = await col("proposals");
  const filter: Record<string, unknown> = {
    daoAddress: daoAddress.toLowerCase(),
    chainId,
  };
  if (status) filter.status = status;
  return c.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray();
}

export async function getProposal(daoAddress: string, proposalId: number, chainId: number) {
  const c = await col("proposals");
  return c.findOne({
    daoAddress: daoAddress.toLowerCase(),
    proposalId: Number(proposalId),
    chainId,
  });
}

export async function updateProposalVotes(
  daoAddress: string,
  proposalId: number,
  chainId: number,
  voteData: {
    votesFor: string;
    votesAgainst: string;
    votesAbstain: string;
    totalVoters: number;
    status?: string;
  },
) {
  const c = await col("proposals");
  await c.updateOne(
    { daoAddress: daoAddress.toLowerCase(), proposalId, chainId },
    {
      $set: {
        votesFor: voteData.votesFor,
        votesAgainst: voteData.votesAgainst,
        votesAbstain: voteData.votesAbstain,
        totalVoters: voteData.totalVoters,
        status: voteData.status ?? "active",
        updatedAt: new Date(),
      },
    },
  );
}

export async function updateProposalStatus(
  daoAddress: string,
  proposalId: number,
  chainId: number,
  status: string,
  txHash?: string | null,
) {
  const c = await col("proposals");
  await c.updateOne(
    { daoAddress: daoAddress.toLowerCase(), proposalId, chainId },
    { $set: { status, txHash: txHash ?? null, updatedAt: new Date() } },
  );
}

// ─── User Votes ───────────────────────────────────────────────────────────────

export async function recordVote(data: {
  userAddress: string;
  daoAddress: string;
  proposalId: number;
  chainId: number;
  vote: number; // 0=for 1=against 2=abstain
  weight?: string;
  txHash?: string | null;
}) {
  const c = await col("user_votes");
  const filter = {
    userAddress: data.userAddress.toLowerCase(),
    daoAddress: data.daoAddress.toLowerCase(),
    proposalId: data.proposalId,
    chainId: data.chainId,
  };
  await c.updateOne(
    filter,
    {
      $set: {
        ...filter,
        vote: data.vote,
        weight: data.weight ?? "0",
        txHash: data.txHash ?? null,
        timestamp: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getUserVote(
  userAddress: string,
  daoAddress: string,
  proposalId: number,
  chainId: number,
) {
  const c = await col("user_votes");
  return c.findOne({
    userAddress: userAddress.toLowerCase(),
    daoAddress: daoAddress.toLowerCase(),
    proposalId,
    chainId,
  });
}

export async function getUserVotes(
  userAddress: string,
  { chainId, limit = 100 }: { chainId?: number; limit?: number } = {},
) {
  const c = await col("user_votes");
  const filter: Record<string, unknown> = { userAddress: userAddress.toLowerCase() };
  if (chainId) filter.chainId = chainId;
  return c.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

export async function recordActivity(data: {
  daoAddress: string;
  chainId: number;
  type: string;
  userAddress?: string;
  proposalId?: number | null;
  payload?: Record<string, unknown>;
}) {
  const c = await col("dao_activity");
  await c.insertOne({
    daoAddress: data.daoAddress.toLowerCase(),
    chainId: data.chainId,
    type: data.type,
    userAddress: (data.userAddress ?? "").toLowerCase(),
    proposalId: data.proposalId ?? null,
    payload: data.payload ?? {},
    timestamp: new Date(),
  });
}

export async function getDAOActivity(
  daoAddress: string,
  chainId: number,
  limit = 20,
) {
  const c = await col("dao_activity");
  return c
    .find({ daoAddress: daoAddress.toLowerCase(), chainId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

// ─── Proposal Chat ────────────────────────────────────────────────────────────

export async function sendChatMessage(data: {
  daoAddress: string;
  chainId: number;
  proposalId: number;
  sender: string;
  senderName?: string | null;
  senderAvatar?: string | null;
  message: string;
  replyToId?: string | null;
}) {
  const c = await col("proposal_chats");
  const doc = {
    daoAddress: data.daoAddress.toLowerCase(),
    chainId: data.chainId,
    proposalId: Number(data.proposalId),
    sender: data.sender.toLowerCase(),
    senderName: data.senderName ?? null,
    senderAvatar: data.senderAvatar ?? null,
    message: data.message.trim(),
    replyToId: data.replyToId ?? null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    timestamp: Date.now(),
    createdAt: new Date(),
  };
  const result = await c.insertOne(doc);
  return { id: result.insertedId.toString(), ...doc };
}

export async function getChatMessages(
  daoAddress: string,
  chainId: number,
  proposalId: number,
  { limit = 50, skip = 0 }: { limit?: number; skip?: number } = {},
) {
  const c = await col("proposal_chats");
  const docs = await c
    .find({
      daoAddress: daoAddress.toLowerCase(),
      chainId,
      proposalId: Number(proposalId),
      isDeleted: false,
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return docs.reverse().map((d) => ({ ...d, id: d._id.toString() }));
}
