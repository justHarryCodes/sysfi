// Guild structured data — PostgreSQL (mirrors nexus-c guildDbService.js)
// Messages / posts / reactions stay in MongoDB via guild-mongo.ts
import pgPool, { withTransaction } from "./postgres";
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
  createdAt: Date;
  updatedAt: Date;
  // snake_case aliases the mobile client expects
  logo_url: string | null;
  banner_url: string | null;
  member_count: number;
  created_by: string;
  linked_dao_address: string | null;
  linked_dao_chain_id: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeGuild(row: Record<string, unknown>): Guild {
  return {
    id:          row.id          as string,
    name:        row.name        as string,
    description: row.description as string,
    genre:       row.genre       as string,
    privacy:     row.privacy     as string,
    logoUrl:     (row.logo_url   as string) || null,
    bannerUrl:   (row.banner_url as string) || null,
    createdBy:   row.created_by  as string,
    memberCount: (row.member_count as number) ?? 0,
    tokenGating: row.token_gating || null,
    linkedDaoAddress:  (row.linked_dao_address  as string) || null,
    linkedDaoChainId:  (row.linked_dao_chain_id as number) || null,
    createdAt:   row.created_at  as Date,
    updatedAt:   row.updated_at  as Date,
    logo_url:              (row.logo_url           as string) || null,
    banner_url:            (row.banner_url         as string) || null,
    member_count:          (row.member_count       as number) ?? 0,
    created_by:            row.created_by          as string,
    linked_dao_address:    (row.linked_dao_address  as string) || null,
    linked_dao_chain_id:   (row.linked_dao_chain_id as number) || null,
  };
}

function generateCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length: len }, () => chars[crypto.randomInt(chars.length)]).join("");
}

async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  if (!pgPool) throw new Error("PostgreSQL not configured");
  const res = await pgPool.query(sql, params);
  return res.rows as T[];
}

// ─── Guild CRUD ───────────────────────────────────────────────────────────────

export async function createGuild(data: {
  name: string; description?: string; genre?: string; privacy?: string;
  logoUrl?: string; bannerUrl?: string; createdBy: string; tokenGating?: unknown;
}): Promise<Guild> {
  const { name, description, genre, privacy, logoUrl, bannerUrl, createdBy, tokenGating } = data;

  return await withTransaction(async (client) => {
    const guildRes = await client.query(
      `INSERT INTO guilds (name, description, genre, privacy, logo_url, banner_url, created_by, token_gating, member_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1) RETURNING *`,
      [name, description || "", genre || "General", privacy || "public",
       logoUrl || null, bannerUrl || null, createdBy,
       tokenGating ? JSON.stringify(tokenGating) : null],
    );
    const guild = guildRes.rows[0];

    await client.query(
      `INSERT INTO guild_members (guild_id, user_id, status) VALUES ($1,$2,'owner')`,
      [guild.id, createdBy],
    );
    await client.query(
      `INSERT INTO guild_chat_settings (guild_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [guild.id],
    );
    return normalizeGuild(guild);
  }) as Guild;
}

export async function getGuildById(guildId: string): Promise<Guild | null> {
  const rows = await q(`SELECT * FROM guilds WHERE id = $1`, [guildId]);
  return rows[0] ? normalizeGuild(rows[0]) : null;
}

export async function updateGuild(guildId: string, ownerUid: string, updates: Record<string, unknown>): Promise<Guild | null> {
  const allowed = ["name", "description", "genre", "logo_url", "banner_url"];
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(updates)) {
    const col = k === "logoUrl" ? "logo_url" : k === "bannerUrl" ? "banner_url" : k;
    if (allowed.includes(col)) {
      fields.push(`${col} = $${idx++}`);
      values.push(v);
    }
  }
  if (!fields.length) return null;
  fields.push(`updated_at = NOW()`);
  values.push(guildId, ownerUid);

  const rows = await q(
    `UPDATE guilds SET ${fields.join(", ")} WHERE id = $${idx++} AND created_by = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ? normalizeGuild(rows[0]) : null;
}

export async function deleteGuild(guildId: string, ownerUid: string): Promise<boolean> {
  const rows = await q(`DELETE FROM guilds WHERE id = $1 AND created_by = $2 RETURNING id`, [guildId, ownerUid]);
  return rows.length > 0;
}

export async function getUserGuilds(userId: string): Promise<Guild[]> {
  const rows = await q(
    `SELECT g.* FROM guilds g
     JOIN guild_members gm ON gm.guild_id = g.id
     WHERE gm.user_id = $1
     ORDER BY g.updated_at DESC`,
    [userId],
  );
  return rows.map(normalizeGuild);
}

export async function getTopGuilds(limit = 10): Promise<Guild[]> {
  const rows = await q(
    `SELECT * FROM guilds WHERE privacy = 'public' ORDER BY member_count DESC, created_at DESC LIMIT $1`,
    [limit],
  );
  return rows.map(normalizeGuild);
}

export async function searchGuilds(query: string, genre?: string, limit = 30): Promise<Guild[]> {
  const params: unknown[] = [`%${query}%`];
  let sql = `SELECT * FROM guilds WHERE privacy = 'public' AND (name ILIKE $1 OR description ILIKE $1)`;
  if (genre) { params.push(genre); sql += ` AND genre = $${params.length}`; }
  params.push(limit);
  sql += ` ORDER BY member_count DESC LIMIT $${params.length}`;
  const rows = await q(sql, params);
  return rows.map(normalizeGuild);
}

export async function getAllLinkedDaoGuilds(): Promise<Guild[]> {
  const rows = await q(`SELECT * FROM guilds WHERE linked_dao_address IS NOT NULL ORDER BY name`);
  return rows.map(normalizeGuild);
}

export async function getGuildsByIds(ids: string[]): Promise<Guild[]> {
  if (!ids.length) return [];
  const rows = await q(`SELECT * FROM guilds WHERE id = ANY($1)`, [ids]);
  return rows.map(normalizeGuild);
}

// ─── Membership ───────────────────────────────────────────────────────────────

export async function getMembership(guildId: string, userId: string) {
  const rows = await q(`SELECT * FROM guild_members WHERE guild_id = $1 AND user_id = $2`, [guildId, userId]);
  return rows[0] || null;
}

export async function getMembers(guildId: string) {
  return await q(`SELECT * FROM guild_members WHERE guild_id = $1 ORDER BY joined_at ASC`, [guildId]);
}

export async function joinGuild(guildId: string, userId: string, memberData: {
  username?: string; displayName?: string; userAvatar?: string; walletAddress?: string;
}, inviteId?: string) {
  return await withTransaction(async (client) => {
    const banCheck = await client.query(
      `SELECT 1 FROM guild_bans WHERE guild_id = $1 AND user_id = $2`, [guildId, userId],
    );
    if ((banCheck.rowCount ?? 0) > 0) throw new Error("You are banned from this guild");

    const res = await client.query(
      `INSERT INTO guild_members (guild_id, user_id, username, display_name, user_avatar, wallet_address, status, invite_id)
       VALUES ($1,$2,$3,$4,$5,$6,'member',$7)
       ON CONFLICT (guild_id, user_id) DO NOTHING RETURNING *`,
      [guildId, userId, memberData.username || null, memberData.displayName || null,
       memberData.userAvatar || null, memberData.walletAddress || null, inviteId || null],
    );

    if ((res.rowCount ?? 0) > 0) {
      await client.query(`UPDATE guilds SET member_count = member_count + 1, updated_at = NOW() WHERE id = $1`, [guildId]);
      if (inviteId) {
        await client.query(`UPDATE guild_invites SET uses = uses + 1 WHERE id = $1 AND is_active = TRUE`, [inviteId]);
      }
    }
    return res.rows[0] || null;
  });
}

export async function leaveGuild(guildId: string, userId: string): Promise<boolean> {
  const guild = await getGuildById(guildId);
  if (!guild) throw new Error("Guild not found");
  if (guild.createdBy === userId) throw new Error("Owner cannot leave — delete the guild instead");

  return await withTransaction(async (client) => {
    const res = await client.query(
      `DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2 RETURNING user_id`, [guildId, userId],
    );
    if ((res.rowCount ?? 0) > 0) {
      await client.query(`UPDATE guilds SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() WHERE id = $1`, [guildId]);
    }
    return (res.rowCount ?? 0) > 0;
  }) as boolean;
}

// ─── Bans ─────────────────────────────────────────────────────────────────────

export async function banUser(guildId: string, userId: string, username: string, bannedBy: string) {
  return await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO guild_bans (guild_id, user_id, username, banned_by) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [guildId, userId, username, bannedBy],
    );
    const del = await client.query(
      `DELETE FROM guild_members WHERE guild_id = $1 AND user_id = $2 RETURNING user_id`, [guildId, userId],
    );
    if ((del.rowCount ?? 0) > 0) {
      await client.query(`UPDATE guilds SET member_count = GREATEST(member_count - 1, 0) WHERE id = $1`, [guildId]);
    }
    return true;
  });
}

// ─── Moderators ───────────────────────────────────────────────────────────────

export async function getModerators(guildId: string) {
  return await q(`SELECT * FROM guild_moderators WHERE guild_id = $1 ORDER BY added_at ASC`, [guildId]);
}

export async function addModerator(guildId: string, userId: string, data: {
  username?: string; userAvatar?: string; roleName?: string;
  permissions?: unknown; addedBy: string;
}) {
  const rows = await q(
    `INSERT INTO guild_moderators (guild_id, user_id, username, user_avatar, role_name, permissions, added_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET
       role_name = EXCLUDED.role_name, permissions = EXCLUDED.permissions, added_at = NOW()
     RETURNING *`,
    [guildId, userId, data.username || null, data.userAvatar || null,
     data.roleName || "Moderator", JSON.stringify(data.permissions || {}), data.addedBy],
  );
  return rows[0];
}

export async function removeModerator(guildId: string, userId: string): Promise<boolean> {
  const rows = await q(`DELETE FROM guild_moderators WHERE guild_id = $1 AND user_id = $2 RETURNING user_id`, [guildId, userId]);
  return rows.length > 0;
}

export async function updateModeratorPermissions(guildId: string, userId: string, permissions: unknown) {
  const rows = await q(
    `UPDATE guild_moderators SET permissions = $3 WHERE guild_id = $1 AND user_id = $2 RETURNING *`,
    [guildId, userId, JSON.stringify(permissions)],
  );
  return rows[0] || null;
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function getInvites(guildId: string) {
  return await q(`SELECT * FROM guild_invites WHERE guild_id = $1 ORDER BY created_at DESC`, [guildId]);
}

export async function getInviteByCode(code: string) {
  const rows = await q(
    `SELECT gi.*, g.name as guild_name, g.description as guild_description,
            g.logo_url, g.banner_url, g.privacy, g.member_count, g.genre,
            g.token_gating, g.created_by
     FROM guild_invites gi
     JOIN guilds g ON g.id = gi.guild_id
     WHERE gi.code = $1 AND gi.is_active = TRUE`,
    [code],
  );
  return rows[0] || null;
}

export async function createInvite(guildId: string, createdBy: string, options: { expiresAt?: Date; maxUses?: number } = {}) {
  const code = generateCode();
  const id = `${guildId}_${code}`;
  const rows = await q(
    `INSERT INTO guild_invites (id, guild_id, code, created_by, expires_at, max_uses) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, guildId, code, createdBy, options.expiresAt || null, options.maxUses || null],
  );
  return rows[0];
}

export async function deactivateInvite(inviteId: string, ownerUid: string): Promise<boolean> {
  const rows = await q(
    `UPDATE guild_invites SET is_active = FALSE
     WHERE id = $1 AND guild_id IN (SELECT id FROM guilds WHERE created_by = $2) RETURNING id`,
    [inviteId, ownerUid],
  );
  return rows.length > 0;
}

// ─── Chat settings ────────────────────────────────────────────────────────────

export async function getChatSettings(guildId: string) {
  const rows = await q(`SELECT * FROM guild_chat_settings WHERE guild_id = $1`, [guildId]);
  return rows[0] || { guild_id: guildId, is_locked: false, message_delay: 0 };
}

export async function updateChatSettings(guildId: string, ownerUid: string, settings: { isLocked?: boolean; messageDelay?: number }) {
  const rows = await q(
    `INSERT INTO guild_chat_settings (guild_id, is_locked, message_delay, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       is_locked = EXCLUDED.is_locked, message_delay = EXCLUDED.message_delay,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [guildId, settings.isLocked ?? false, settings.messageDelay ?? 0, ownerUid],
  );
  return rows[0];
}

// ─── External links ───────────────────────────────────────────────────────────

export async function getExternalLinks(guildId: string) {
  const rows = await q(`SELECT * FROM guild_external_links WHERE guild_id = $1`, [guildId]);
  return rows[0] || null;
}

export async function updateExternalLinks(guildId: string, ownerUid: string, links: {
  website?: string; twitter?: string; discord?: string; telegram?: string; other?: string;
}) {
  const rows = await q(
    `INSERT INTO guild_external_links (guild_id, website, twitter, discord, telegram, other, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
     ON CONFLICT (guild_id) DO UPDATE SET
       website = EXCLUDED.website, twitter = EXCLUDED.twitter, discord = EXCLUDED.discord,
       telegram = EXCLUDED.telegram, other = EXCLUDED.other,
       updated_by = EXCLUDED.updated_by, updated_at = NOW()
     RETURNING *`,
    [guildId, links.website || null, links.twitter || null, links.discord || null,
     links.telegram || null, links.other || null, ownerUid],
  );
  return rows[0];
}

// ─── DAO link ─────────────────────────────────────────────────────────────────

export async function linkDao(guildId: string, ownerUid: string, daoAddress: string, chainId: number) {
  const rows = await q(
    `UPDATE guilds SET linked_dao_address = $3, linked_dao_chain_id = $4, updated_at = NOW()
     WHERE id = $1 AND created_by = $2 RETURNING *`,
    [guildId, ownerUid, daoAddress.toLowerCase(), chainId],
  );
  return rows[0] ? normalizeGuild(rows[0]) : null;
}

export async function unlinkDao(guildId: string, ownerUid: string) {
  const rows = await q(
    `UPDATE guilds SET linked_dao_address = NULL, linked_dao_chain_id = NULL, updated_at = NOW()
     WHERE id = $1 AND created_by = $2 RETURNING *`,
    [guildId, ownerUid],
  );
  return rows[0] ? normalizeGuild(rows[0]) : null;
}

// ─── Unread (PostgreSQL table if exists, graceful fallback) ───────────────────

export async function getUnreadCount(guildId: string, userId: string): Promise<number> {
  try {
    const rows = await q<{ count: number }>(
      `SELECT count FROM guild_unread WHERE guild_id = $1 AND user_id = $2`, [guildId, userId],
    );
    return rows[0]?.count ?? 0;
  } catch { return 0; }
}

export async function resetUnread(guildId: string, userId: string): Promise<void> {
  try {
    await q(
      `INSERT INTO guild_unread (guild_id, user_id, count) VALUES ($1,$2,0)
       ON CONFLICT (guild_id, user_id) DO UPDATE SET count = 0`,
      [guildId, userId],
    );
  } catch { /* non-fatal */ }
}

export async function incrementUnread(guildId: string, excludeUserId: string): Promise<void> {
  try {
    await q(
      `INSERT INTO guild_unread (guild_id, user_id, count)
       SELECT $1, user_id, 1 FROM guild_members WHERE guild_id = $1 AND user_id != $2
       ON CONFLICT (guild_id, user_id) DO UPDATE SET count = guild_unread.count + 1`,
      [guildId, excludeUserId],
    );
  } catch { /* non-fatal */ }
}
