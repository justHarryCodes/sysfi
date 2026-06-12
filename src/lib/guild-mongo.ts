// Guild messages and posts — MongoDB service
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const EDIT_LIMIT_MS = 15 * 60 * 1000;

const col = {
  messages:    async () => (await getDb()).collection("guild_messages"),
  posts:       async () => (await getDb()).collection("guild_posts"),
  likes:       async () => (await getDb()).collection("guild_post_likes"),
  comments:    async () => (await getDb()).collection("guild_post_comments"),
  impressions: async () => (await getDb()).collection("guild_post_impressions"),
  reactions:   async () => (await getDb()).collection("post_reactions"),
  reposts:     async () => (await getDb()).collection("post_reposts"),
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function sendMessage(guildId: string, data: {
  userId: string; username?: string; displayName?: string;
  userAvatar?: string; text: string; replyTo?: string;
}) {
  const doc = {
    guildId,
    userId:      data.userId,
    username:    data.username    || null,
    displayName: data.displayName || null,
    userAvatar:  data.userAvatar  || null,
    text:        data.text.trim(),
    isEdited: false, editedAt: null,
    isPinned: false, pinnedAt: null, pinnedBy: null,
    replyTo:  data.replyTo || null,
    timestamp: Date.now(),
    createdAt: new Date(),
  };
  const result = await (await col.messages()).insertOne(doc);
  return { id: result.insertedId.toString(), ...doc };
}

export async function getMessages(guildId: string, { limit = 30, before = null as string | null } = {}) {
  const filter: Record<string, unknown> = { guildId };
  if (before) filter.timestamp = { $lt: Number(before) };
  const docs = await (await col.messages()).find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
  return docs.reverse().map(formatMessage);
}

export async function getMessagesSince(guildId: string, since: number) {
  const docs = await (await col.messages())
    .find({ guildId, timestamp: { $gt: since } })
    .sort({ timestamp: 1 }).toArray();
  return docs.map(formatMessage);
}

export async function getPinnedMessages(guildId: string) {
  const docs = await (await col.messages())
    .find({ guildId, isPinned: true }).sort({ pinnedAt: -1 }).toArray();
  return docs.map(formatMessage);
}

export async function editMessage(messageId: string, userId: string, newText: string) {
  const msg = await (await col.messages()).findOne({ _id: new ObjectId(messageId) });
  if (!msg) throw new Error("Message not found");
  if (msg.userId !== userId) throw new Error("You can only edit your own messages");
  if (Date.now() - msg.timestamp > EDIT_LIMIT_MS) throw new Error("Edit window expired (15 min)");
  await (await col.messages()).updateOne(
    { _id: new ObjectId(messageId) },
    { $set: { text: newText.trim(), isEdited: true, editedAt: new Date() } },
  );
  return true;
}

export async function deleteMessage(messageId: string, userId: string, isAdmin = false) {
  const msg = await (await col.messages()).findOne({ _id: new ObjectId(messageId) });
  if (!msg) throw new Error("Message not found");
  if (!isAdmin && msg.userId !== userId) throw new Error("You can only delete your own messages");
  await (await col.messages()).deleteOne({ _id: new ObjectId(messageId) });
  return true;
}

export async function deleteAllUserMessages(guildId: string, userId: string) {
  const res = await (await col.messages()).deleteMany({ guildId, userId });
  return res.deletedCount;
}

export async function pinMessage(messageId: string, pinnedBy: string) {
  await (await col.messages()).updateOne(
    { _id: new ObjectId(messageId) },
    { $set: { isPinned: true, pinnedAt: new Date(), pinnedBy } },
  );
}

export async function unpinMessage(messageId: string) {
  await (await col.messages()).updateOne(
    { _id: new ObjectId(messageId) },
    { $set: { isPinned: false, pinnedAt: null, pinnedBy: null } },
  );
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export async function createPost(guildId: string, data: {
  userId: string; username?: string; userAvatar?: string; description: string; imageUrl?: string;
}) {
  const doc = {
    guildId,
    userId:      data.userId,
    username:    data.username   || null,
    userAvatar:  data.userAvatar || null,
    description: data.description.trim(),
    imageUrl:    data.imageUrl   || null,
    likesCount: 0, commentsCount: 0, repostCount: 0,
    reactionCounts: {} as Record<string, number>,
    uniqueReactors: 0, impressionCount: 0,
    visibilityScore: 0,
    isDeleted: false,
    timestamp: Date.now(),
    createdAt: new Date(),
    updatedAt: null as Date | null,
  };
  const result = await (await col.posts()).insertOne(doc);
  return { id: result.insertedId.toString(), ...doc };
}

export async function getPosts(guildId: string, { limit = 10, before = null as string | null } = {}) {
  const filter: Record<string, unknown> = { guildId, isDeleted: false };
  if (before) filter.timestamp = { $lt: Number(before) };
  const docs = await (await col.posts()).find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
  return docs.map(formatPost);
}

export async function getPostById(postId: string) {
  const doc = await (await col.posts()).findOne({ _id: new ObjectId(postId), isDeleted: false });
  return doc ? formatPost(doc) : null;
}

export async function deletePost(postId: string, userId: string, isAdmin = false) {
  const post = await (await col.posts()).findOne({ _id: new ObjectId(postId) });
  if (!post) throw new Error("Post not found");
  if (!isAdmin && post.userId !== userId) throw new Error("You can only delete your own posts");
  await (await col.posts()).updateOne(
    { _id: new ObjectId(postId) },
    { $set: { isDeleted: true, updatedAt: new Date() } },
  );
  return true;
}

// ─── Likes ────────────────────────────────────────────────────────────────────

export async function toggleLike(postId: string, guildId: string, userId: string, username?: string) {
  const existing = await (await col.likes()).findOne({ postId, userId });
  if (existing) {
    await (await col.likes()).deleteOne({ _id: existing._id });
    await (await col.posts()).updateOne({ _id: new ObjectId(postId) }, { $inc: { likesCount: -1 } });
    return { liked: false };
  }
  await (await col.likes()).insertOne({ postId, guildId, userId, username: username || null, likedAt: new Date() });
  await (await col.posts()).updateOne({ _id: new ObjectId(postId) }, { $inc: { likesCount: 1 } });
  return { liked: true };
}

export async function isPostLiked(postId: string, userId: string) {
  return !!(await (await col.likes()).findOne({ postId, userId }));
}

export async function getPostLikes(postId: string) {
  return (await col.likes()).find({ postId }).sort({ likedAt: -1 }).limit(50).toArray();
}

// ─── Reactions ────────────────────────────────────────────────────────────────

const VALID_REACTIONS = new Set(["fire", "heart", "thumbsup", "laugh", "wow", "sad"]);

export async function upsertReaction(postId: string, guildId: string, userId: string, reactionType: string) {
  if (!VALID_REACTIONS.has(reactionType)) throw new Error("Invalid reaction type");

  const reactions = await col.reactions();
  const posts     = await col.posts();
  const existing  = await reactions.findOne({ postId, userId });

  if (existing) {
    if (existing.reactionType === reactionType) {
      await reactions.deleteOne({ _id: existing._id });
      await posts.updateOne({ _id: new ObjectId(postId) }, {
        $inc: { [`reactionCounts.${reactionType}`]: -1, uniqueReactors: -1 },
      });
      return null;
    }
    await reactions.updateOne({ _id: existing._id }, { $set: { reactionType, updatedAt: new Date() } });
    await posts.updateOne({ _id: new ObjectId(postId) }, {
      $inc: {
        [`reactionCounts.${existing.reactionType}`]: -1,
        [`reactionCounts.${reactionType}`]: 1,
      },
    });
    return reactionType;
  }

  await reactions.insertOne({ postId, guildId, userId, reactionType, createdAt: new Date() });
  await posts.updateOne({ _id: new ObjectId(postId) }, {
    $inc: { [`reactionCounts.${reactionType}`]: 1, uniqueReactors: 1 },
  });
  return reactionType;
}

export async function getUserReaction(postId: string, userId: string) {
  const r = await (await col.reactions()).findOne({ postId, userId });
  return r?.reactionType || null;
}

export async function getReactionSummary(postId: string) {
  const post = await (await col.posts()).findOne(
    { _id: new ObjectId(postId) },
    { projection: { reactionCounts: 1, uniqueReactors: 1 } }
  );
  return { counts: post?.reactionCounts || {}, uniqueReactors: post?.uniqueReactors || 0 };
}

// ─── Reposts ──────────────────────────────────────────────────────────────────

export async function repostPost(originalPostId: string, originalGuildId: string, data: {
  userId: string; username?: string; userAvatar?: string; guildId: string; comment?: string;
}) {
  const original = await (await col.posts()).findOne({ _id: new ObjectId(originalPostId) });
  if (!original) throw new Error("Original post not found");

  const reposts = await col.reposts();
  if (await reposts.findOne({ originalPostId, userId: data.userId })) {
    throw new Error("You already reposted this");
  }

  await reposts.insertOne({
    originalPostId, originalGuildId,
    userId: data.userId, username: data.username || null, userAvatar: data.userAvatar || null,
    guildId: data.guildId, comment: data.comment?.trim() || null,
    timestamp: Date.now(), createdAt: new Date(),
  });

  await (await col.posts()).updateOne({ _id: new ObjectId(originalPostId) }, { $inc: { repostCount: 1 } });

  const repostDoc = {
    guildId: data.guildId,
    userId: data.userId, username: data.username || null, userAvatar: data.userAvatar || null,
    description: original.description,
    imageUrl: original.imageUrl || null,
    isRepost: true, originalPostId, originalAuthor: original.username,
    originalGuildId, repostComment: data.comment?.trim() || null,
    likesCount: 0, commentsCount: 0, repostCount: 0,
    reactionCounts: {} as Record<string, number>,
    uniqueReactors: 0, visibilityScore: 0, isDeleted: false,
    timestamp: Date.now(), createdAt: new Date(), updatedAt: null as Date | null,
  };
  const result = await (await col.posts()).insertOne(repostDoc);
  return { id: result.insertedId.toString(), ...repostDoc };
}

export async function hasUserReposted(originalPostId: string, userId: string) {
  return !!(await (await col.reposts()).findOne({ originalPostId, userId }));
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addComment(postId: string, guildId: string, data: {
  userId: string; username?: string; userAvatar?: string; text: string;
}) {
  const doc = {
    postId, guildId,
    userId:     data.userId,
    username:   data.username   || null,
    userAvatar: data.userAvatar || null,
    text:       data.text.trim(),
    isDeleted:  false,
    timestamp:  Date.now(),
    createdAt:  new Date(),
  };
  const result = await (await col.comments()).insertOne(doc);
  await (await col.posts()).updateOne({ _id: new ObjectId(postId) }, { $inc: { commentsCount: 1 } });
  return { id: result.insertedId.toString(), ...doc };
}

export async function getComments(postId: string, { limit = 30, skip = 0 } = {}) {
  const docs = await (await col.comments())
    .find({ postId, isDeleted: false }).sort({ timestamp: 1 }).skip(skip).limit(limit).toArray();
  return docs.map((d) => ({ ...d, id: d._id.toString() }));
}

// ─── Impressions ──────────────────────────────────────────────────────────────

export async function addImpression(postId: string, userId: string) {
  try {
    await (await col.impressions()).insertOne({ postId, userId, createdAt: new Date() });
    await (await col.posts()).updateOne({ _id: new ObjectId(postId) }, { $inc: { impressionCount: 1 } });
    return true;
  } catch (e: unknown) {
    if ((e as { code?: number }).code === 11000) return false;
    throw e;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessage(doc: Record<string, unknown>) {
  return {
    id: (doc._id as ObjectId).toString(),
    guildId: doc.guildId, userId: doc.userId,
    username: doc.username, displayName: doc.displayName, userAvatar: doc.userAvatar,
    text: doc.text, isEdited: doc.isEdited, editedAt: doc.editedAt,
    isPinned: doc.isPinned, pinnedAt: doc.pinnedAt, pinnedBy: doc.pinnedBy,
    replyTo: doc.replyTo, createdAt: doc.createdAt, timestamp: doc.timestamp,
  };
}

function formatPost(doc: Record<string, unknown>) {
  return {
    id: (doc._id as ObjectId).toString(),
    guildId: doc.guildId, userId: doc.userId,
    username: doc.username, userAvatar: doc.userAvatar,
    description: doc.description, imageUrl: doc.imageUrl,
    likesCount:      (doc.likesCount      as number) ?? 0,
    commentsCount:   (doc.commentsCount   as number) ?? 0,
    reactionCounts:  (doc.reactionCounts  as Record<string, number>) || {},
    repostCount:     (doc.repostCount     as number) ?? 0,
    uniqueReactors:  (doc.uniqueReactors  as number) ?? 0,
    impressionCount: (doc.impressionCount as number) ?? 0,
    visibilityScore: (doc.visibilityScore as number) ?? 0,
    isRepost:        (doc.isRepost        as boolean) || false,
    originalPostId:  doc.originalPostId  || null,
    originalAuthor:  doc.originalAuthor  || null,
    repostComment:   doc.repostComment   || null,
    isDeleted: doc.isDeleted, createdAt: doc.createdAt, timestamp: doc.timestamp,
  };
}

export async function ensureGuildIndexes() {
  const db = await getDb();
  await db.collection("guild_messages").createIndexes([
    { key: { guildId: 1, timestamp: -1 } },
    { key: { guildId: 1, isPinned: 1 } },
    { key: { guildId: 1, userId: 1 } },
  ]);
  await db.collection("guild_posts").createIndexes([
    { key: { guildId: 1, isDeleted: 1, timestamp: -1 } },
    { key: { visibilityScore: -1, timestamp: -1 } },
  ]);
  await db.collection("guild_post_likes").createIndexes([
    { key: { postId: 1, userId: 1 }, unique: true },
  ]);
  await db.collection("guild_post_comments").createIndexes([
    { key: { postId: 1, isDeleted: 1, timestamp: 1 } },
  ]);
  await db.collection("guild_post_impressions").createIndexes([
    { key: { postId: 1, userId: 1 }, unique: true },
  ]);
  await db.collection("post_reactions").createIndexes([
    { key: { postId: 1, userId: 1 }, unique: true },
  ]);
  await db.collection("post_reposts").createIndexes([
    { key: { originalPostId: 1, userId: 1 }, unique: true },
  ]);
}
