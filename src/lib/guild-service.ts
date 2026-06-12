// Guild structured data — MongoDB (replaces PostgreSQL guildDbService)
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Guild {
  id: string;
  name: string;
  description: string;
  genre: string;
  privacy: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  createdBy: string;
  memberCount: number;
  tokenGating: unknown;
  linkedDaoAddress: string | null;
  linkedDaoChainId: number | null;
  chatSettings: { isLocked: boolean; messageDelay: number };
  externalLinks: Record<string, string | null> | null;
  createdAt: Date;
  updatedAt: Date;
  logo_url: string | null;
  banner_url: string | null;
  member_count: number;
  created_by: string;
  linked_dao_address: string | null;
  linked_dao_chain_id: number | null;
}

// ─── Collection helpers ───────────────────────────────────────────────────────

const col = {
  guilds:      async () => (await getDb()).collection("guilds"),
  members:     async () => (await getDb()).collection("guild_members"),
  bans:        async () => (await getDb()).collection("guild_bans"),
  moderators:  async () => (await getDb()).collection("guild_moderators"),
  invites:     async () => (await getDb()).collection("guild_invites"),
  unread:      async () => (await getDb()).collection("guild_unread"),
};

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalizeGuild(doc: Record<string, unknown>): Guild {
  const id = (doc._id as ObjectId).toString();
  return {
    id,
    name:        doc.name        as string,
    description: doc.description as string,
    genre:       doc.genre       as string,
    privacy:     doc.privacy     as string,
    logoUrl:     (doc.logoUrl    as string) || null,
    bannerUrl:   (doc.bannerUrl  as string) || null,
    createdBy:   doc.createdBy   as string,
    memberCount: (doc.memberCount as number) ?? 0,
    tokenGating: doc.tokenGating || null,
    linkedDaoAddress:  (doc.linkedDaoAddress  as string) || null,
    linkedDaoChainId:  (doc.linkedDaoChainId  as number) || null,
    chatSettings: (doc.chatSettings as Guild["chatSettings"]) || { isLocked: false, messageDelay: 0 },
    externalLinks: (doc.externalLinks as Record<string, string | null>) || null,
    createdAt:   doc.createdAt   as Date,
    updatedAt:   doc.updatedAt   as Date,
    // snake_case aliases for wallet compatibility
    logo_url:              (doc.logoUrl           as string) || null,
    banner_url:            (doc.bannerUrl         as string) || null,
    member_count:          (doc.memberCount       as number) ?? 0,
    created_by:            doc.createdBy          as string,
    linked_dao_address:    (doc.linkedDaoAddress  as string) || null,
    linked_dao_chain_id:   (doc.linkedDaoChainId  as number) || null,
  };
}

// ─── Guild CRUD ───────────────────────────────────────────────────────────────

export async function createGuild(data: {
  name: string; description?: string; genre?: string; privacy?: string;
  logoUrl?: string; bannerUrl?: string; createdBy: string; tokenGating?: unknown;
}): Promise<Guild> {
  const doc = {
    name:        data.name,
    description: data.description || "",
    genre:       data.genre       || "general",
    privacy:     data.privacy     || "public",
    logoUrl:     data.logoUrl     || null,
    bannerUrl:   data.bannerUrl   || null,
    createdBy:   data.createdBy,
    memberCount: 1,
    tokenGating: data.tokenGating || null,
    linkedDaoAddress:  null as string | null,
    linkedDaoChainId:  null as number | null,
    chatSettings: { isLocked: false, messageDelay: 0 },
    externalLinks: null as Record<string, string | null> | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await (await col.guilds()).insertOne(doc);
  const guildId = result.insertedId.toString();

  await (await col.members()).insertOne({
    guildId, userId: data.createdBy, status: "owner",
    username: null, displayName: null, userAvatar: null, walletAddress: null,
    inviteId: null, joinedAt: new Date(),
  });

  return normalizeGuild({ _id: result.insertedId, ...doc });
}

export async function getGuildById(guildId: string): Promise<Guild | null> {
  try {
    const doc = await (await col.guilds()).findOne({ _id: new ObjectId(guildId) });
    return doc ? normalizeGuild(doc as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function getGuildsByIds(guildIds: string[]): Promise<Guild[]> {
  if (!guildIds?.length) return [];
  const ids = guildIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter((x): x is ObjectId => x !== null);
  const docs = await (await col.guilds()).find({ _id: { $in: ids } }).toArray();
  return docs.map((d) => normalizeGuild(d as Record<string, unknown>));
}

export async function updateGuild(guildId: string, ownerUid: string, updates: Record<string, unknown>): Promise<Guild | null> {
  const allowed: Record<string, string> = {
    name: "name", description: "description", genre: "genre",
    logoUrl: "logoUrl", bannerUrl: "bannerUrl",
  };
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(updates)) {
    if (allowed[k]) $set[allowed[k]] = v;
  }
  if (Object.keys($set).length === 1) return null;

  const result = await (await col.guilds()).findOneAndUpdate(
    { _id: new ObjectId(guildId), createdBy: ownerUid },
    { $set },
    { returnDocument: "after" },
  );
  return result ? normalizeGuild(result as Record<string, unknown>) : null;
}

export async function deleteGuild(guildId: string, ownerUid: string): Promise<boolean> {
  const res = await (await col.guilds()).deleteOne({ _id: new ObjectId(guildId), createdBy: ownerUid });
  return res.deletedCount > 0;
}

// ─── Guild lists ──────────────────────────────────────────────────────────────

export async function getUserGuilds(userId: string): Promise<Guild[]> {
  const memberships = await (await col.members()).find({ userId }).toArray();
  const guildIds = memberships.map((m) => {
    try { return new ObjectId(m.guildId as string); } catch { return null; }
  }).filter((x): x is ObjectId => x !== null);
  if (!guildIds.length) return [];
  const docs = await (await col.guilds()).find({ _id: { $in: guildIds } }).sort({ updatedAt: -1 }).toArray();
  return docs.map((d) => normalizeGuild(d as Record<string, unknown>));
}

export async function getTopGuilds(limit = 10): Promise<Guild[]> {
  const docs = await (await col.guilds())
    .find({ privacy: "public" }).sort({ memberCount: -1, createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => normalizeGuild(d as Record<string, unknown>));
}

export async function searchGuilds(query: string, genre: string | null = null, limit = 30): Promise<Guild[]> {
  const filter: Record<string, unknown> = {
    privacy: "public",
    $or: [
      { name:        { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ],
  };
  if (genre) filter.genre = genre;
  const docs = await (await col.guilds()).find(filter).sort({ memberCount: -1 }).limit(limit).toArray();
  return docs.map((d) => normalizeGuild(d as Record<string, unknown>));
}

export async function getAllLinkedDaoGuilds(): Promise<Guild[]> {
  const docs = await (await col.guilds())
    .find({ linkedDaoAddress: { $ne: null } }).sort({ name: 1 }).toArray();
  return docs.map((d) => normalizeGuild(d as Record<string, unknown>));
}

// ─── Membership ───────────────────────────────────────────────────────────────

export async function getMembership(guildId: string, userId: string) {
  return (await col.members()).findOne({ guildId, userId });
}

export async function joinGuild(guildId: string, userId: string, memberData: {
  username?: string; displayName?: string; userAvatar?: string; walletAddress?: string;
}, inviteId?: string) {
  const ban = await (await col.bans()).findOne({ guildId, userId });
  if (ban) throw new Error("You are banned from this guild");

  const existing = await (await col.members()).findOne({ guildId, userId });
  if (existing) return existing;

  const doc = {
    guildId, userId, status: "member",
    username:      memberData.username      || null,
    displayName:   memberData.displayName   || null,
    userAvatar:    memberData.userAvatar    || null,
    walletAddress: memberData.walletAddress || null,
    inviteId:      inviteId                 || null,
    joinedAt:      new Date(),
  };
  await (await col.members()).insertOne(doc);
  await (await col.guilds()).updateOne({ _id: new ObjectId(guildId) }, {
    $inc: { memberCount: 1 }, $set: { updatedAt: new Date() },
  });
  if (inviteId) {
    await (await col.invites()).updateOne({ _id: new ObjectId(inviteId), isActive: true }, { $inc: { uses: 1 } });
  }
  return doc;
}

export async function leaveGuild(guildId: string, userId: string) {
  const guild = await getGuildById(guildId);
  if (!guild) throw new Error("Guild not found");
  if (guild.createdBy === userId) throw new Error("Owner cannot leave — delete the guild instead");

  const res = await (await col.members()).deleteOne({ guildId, userId });
  if (res.deletedCount > 0) {
    await (await col.guilds()).updateOne({ _id: new ObjectId(guildId) }, {
      $inc: { memberCount: -1 }, $set: { updatedAt: new Date() },
    });
  }
  return res.deletedCount > 0;
}

export async function getMembers(guildId: string) {
  return (await col.members()).find({ guildId }).sort({ joinedAt: 1 }).toArray();
}

export async function banUser(guildId: string, userId: string, username: string, bannedBy: string) {
  await (await col.bans()).updateOne(
    { guildId, userId },
    { $set: { guildId, userId, username, bannedBy, bannedAt: new Date() } },
    { upsert: true },
  );
  const res = await (await col.members()).deleteOne({ guildId, userId });
  if (res.deletedCount > 0) {
    await (await col.guilds()).updateOne({ _id: new ObjectId(guildId) }, { $inc: { memberCount: -1 } });
  }
  return true;
}

// ─── Moderators ───────────────────────────────────────────────────────────────

export async function getModerators(guildId: string) {
  return (await col.moderators()).find({ guildId }).sort({ addedAt: 1 }).toArray();
}

export async function addModerator(guildId: string, userId: string, data: {
  username?: string; userAvatar?: string; roleName?: string; permissions?: object; addedBy: string;
}) {
  const doc = {
    guildId, userId,
    username:    data.username    || null,
    userAvatar:  data.userAvatar  || null,
    roleName:    data.roleName    || "moderator",
    permissions: data.permissions || {},
    addedBy:     data.addedBy,
    addedAt:     new Date(),
  };
  await (await col.moderators()).updateOne({ guildId, userId }, { $set: doc }, { upsert: true });
  return doc;
}

export async function removeModerator(guildId: string, userId: string) {
  const res = await (await col.moderators()).deleteOne({ guildId, userId });
  return res.deletedCount > 0;
}

export async function updateModeratorPermissions(guildId: string, userId: string, permissions: object) {
  const result = await (await col.moderators()).findOneAndUpdate(
    { guildId, userId },
    { $set: { permissions } },
    { returnDocument: "after" },
  );
  return result;
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function getInvites(guildId: string) {
  return (await col.invites()).find({ guildId }).sort({ createdAt: -1 }).toArray();
}

export async function getInviteByCode(code: string) {
  const invite = await (await col.invites()).findOne({ code, isActive: true });
  if (!invite) return null;
  const guild = await getGuildById(invite.guildId as string);
  if (!guild) return null;
  return {
    ...invite,
    id: (invite._id as ObjectId).toString(),
    guild_name: guild.name,
    guild_description: guild.description,
    logo_url: guild.logoUrl,
    banner_url: guild.bannerUrl,
    privacy: guild.privacy,
    member_count: guild.memberCount,
    genre: guild.genre,
    token_gating: guild.tokenGating,
    created_by: guild.createdBy,
  };
}

export async function createInvite(guildId: string, createdBy: string, options: {
  expiresAt?: Date; maxUses?: number;
} = {}) {
  const code = generateCode();
  const doc = {
    guildId, code, createdBy,
    expiresAt: options.expiresAt || null,
    maxUses:   options.maxUses   || null,
    uses:      0,
    isActive:  true,
    createdAt: new Date(),
  };
  const result = await (await col.invites()).insertOne(doc);
  return { id: result.insertedId.toString(), ...doc };
}

export async function deactivateInvite(inviteId: string, ownerUid: string) {
  const invite = await (await col.invites()).findOne({ _id: new ObjectId(inviteId) });
  if (!invite) return false;
  const guild = await getGuildById(invite.guildId as string);
  if (!guild || guild.createdBy !== ownerUid) return false;
  const res = await (await col.invites()).updateOne({ _id: new ObjectId(inviteId) }, { $set: { isActive: false } });
  return res.modifiedCount > 0;
}

// ─── Chat settings ────────────────────────────────────────────────────────────

export async function getChatSettings(guildId: string) {
  const guild = await (await col.guilds()).findOne(
    { _id: new ObjectId(guildId) },
    { projection: { chatSettings: 1 } }
  );
  return guild?.chatSettings || { is_locked: false, message_delay: 0 };
}

export async function updateChatSettings(guildId: string, _ownerUid: string, settings: {
  isLocked?: boolean; messageDelay?: number;
}) {
  const chatSettings = {
    isLocked:     settings.isLocked     ?? false,
    messageDelay: settings.messageDelay ?? 0,
    is_locked:    settings.isLocked     ?? false,
    message_delay: settings.messageDelay ?? 0,
  };
  await (await col.guilds()).updateOne({ _id: new ObjectId(guildId) }, { $set: { chatSettings } });
  return chatSettings;
}

// ─── External links ───────────────────────────────────────────────────────────

export async function getExternalLinks(guildId: string) {
  const guild = await (await col.guilds()).findOne(
    { _id: new ObjectId(guildId) },
    { projection: { externalLinks: 1 } }
  );
  return guild?.externalLinks || null;
}

export async function updateExternalLinks(guildId: string, _ownerUid: string, links: Record<string, string | null>) {
  const externalLinks = {
    website:  links.website  || null,
    twitter:  links.twitter  || null,
    discord:  links.discord  || null,
    telegram: links.telegram || null,
    other:    links.other    || null,
    updatedAt: new Date(),
  };
  await (await col.guilds()).updateOne({ _id: new ObjectId(guildId) }, { $set: { externalLinks } });
  return externalLinks;
}

// ─── DAO link ─────────────────────────────────────────────────────────────────

export async function linkDao(guildId: string, ownerUid: string, daoAddress: string, chainId: number) {
  const result = await (await col.guilds()).findOneAndUpdate(
    { _id: new ObjectId(guildId), createdBy: ownerUid },
    { $set: { linkedDaoAddress: daoAddress.toLowerCase(), linkedDaoChainId: chainId, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? normalizeGuild(result as Record<string, unknown>) : null;
}

export async function unlinkDao(guildId: string, ownerUid: string) {
  const result = await (await col.guilds()).findOneAndUpdate(
    { _id: new ObjectId(guildId), createdBy: ownerUid },
    { $set: { linkedDaoAddress: null, linkedDaoChainId: null, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ? normalizeGuild(result as Record<string, unknown>) : null;
}

// ─── Unread (MongoDB-based, no Redis) ────────────────────────────────────────

export async function getUnreadCount(guildId: string, userId: string): Promise<number> {
  const doc = await (await col.unread()).findOne({ guildId, userId });
  return (doc?.count as number) || 0;
}

export async function incrementUnread(guildId: string, userId: string) {
  await (await col.unread()).updateOne(
    { guildId, userId },
    { $inc: { count: 1 } },
    { upsert: true },
  );
}

export async function resetUnread(guildId: string, userId: string) {
  await (await col.unread()).updateOne({ guildId, userId }, { $set: { count: 0 } }, { upsert: true });
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export async function ensureGuildServiceIndexes() {
  const db = await getDb();
  await db.collection("guilds").createIndexes([
    { key: { privacy: 1, memberCount: -1 } },
    { key: { linkedDaoAddress: 1 } },
  ]);
  await db.collection("guild_members").createIndexes([
    { key: { guildId: 1, userId: 1 }, unique: true },
    { key: { userId: 1 } },
  ]);
  await db.collection("guild_bans").createIndexes([
    { key: { guildId: 1, userId: 1 }, unique: true },
  ]);
  await db.collection("guild_moderators").createIndexes([
    { key: { guildId: 1, userId: 1 }, unique: true },
  ]);
  await db.collection("guild_invites").createIndexes([
    { key: { code: 1 }, unique: true },
    { key: { guildId: 1 } },
  ]);
  await db.collection("guild_unread").createIndexes([
    { key: { guildId: 1, userId: 1 }, unique: true },
  ]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join("");
}
