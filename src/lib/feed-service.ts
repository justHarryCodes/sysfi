// Feed ranking and aggregation — ported from nexus-c feedService.js
import { getDb } from "./mongodb";
import { getGuildsByIds } from "./guild-service";

const REACTION_WEIGHT: Record<string, number> = {
  fire: 1.5, heart: 1.0, thumbsup: 1.0, laugh: 1.2, wow: 1.3, sad: 0.8,
};
const COMMENT_W = 2.5;
const REPOST_W  = 4.0;
const GRAVITY   = 1.6;
const SCALE     = 10_000;
const UNIQUE_CAP = 20;

export function computeVisibilityScore(post: Record<string, unknown>): number {
  const reactions    = (post.reactionCounts as Record<string, number>) || {};
  const comments     = (post.commentsCount  as number) || 0;
  const reposts      = (post.repostCount    as number) || 0;
  const uniqueActors = (post.uniqueReactors as number) || 0;
  const totalActors  = Object.values(reactions).reduce((s, n) => s + n, 0) + comments + reposts;

  const reactionScore = Object.entries(reactions).reduce((sum, [type, count]) => {
    return sum + count * (REACTION_WEIGHT[type] || 1.0);
  }, 0);
  const raw = reactionScore + comments * COMMENT_W + reposts * REPOST_W;

  const uniqueRatio   = totalActors > 0 ? Math.min(uniqueActors / UNIQUE_CAP, 1) : 0;
  const diversityMult = 1 + uniqueRatio * 0.5;

  const ageHours  = Math.max((Date.now() - ((post.timestamp as number) || Date.now())) / 3_600_000, 0.1);
  const timeFactor = 1 / Math.pow(ageHours + 2, GRAVITY);

  return raw * diversityMult * timeFactor * SCALE;
}

export async function refreshPostScore(postId: string) {
  try {
    const { ObjectId } = await import("mongodb");
    const posts = (await getDb()).collection("guild_posts");
    const post  = await posts.findOne({ _id: new ObjectId(postId) });
    if (!post) return;
    const score = computeVisibilityScore(post as Record<string, unknown>);
    await posts.updateOne({ _id: new ObjectId(postId) }, { $set: { visibilityScore: score } });
    return score;
  } catch { /* non-critical */ }
}

export async function getActivityFeed(_userId: string, { page = 1, limit = 20 } = {}) {
  try {
    const posts    = (await getDb()).collection("guild_posts");
    const rawLimit = limit * 5;
    const offset   = (page - 1) * limit;

    const docs = await posts
      .find({ isDeleted: false })
      .sort({ visibilityScore: -1, timestamp: -1 })
      .skip(offset).limit(rawLimit).toArray();

    const uniqueGuildIds = [...new Set(docs.map((d) => d.guildId as string).filter(Boolean))];
    const guilds    = await getGuildsByIds(uniqueGuildIds);
    const guildMap  = Object.fromEntries(guilds.map((g) => [g.id, g]));

    const enriched = docs.map((doc) => {
      const guild     = guildMap[doc.guildId as string] || {};
      const liveScore = computeVisibilityScore(doc as Record<string, unknown>);
      return {
        id:             doc._id.toString(),
        guildId:        doc.guildId,
        guildName:      (guild as { name?: string }).name      || "Unknown Guild",
        guildLogoUrl:   (guild as { logoUrl?: string }).logoUrl || null,
        userId:         doc.userId,
        username:       doc.username,
        userAvatar:     doc.userAvatar  || null,
        description:    doc.description,
        imageUrl:       doc.imageUrl    || null,
        reactionCounts: doc.reactionCounts || {},
        commentsCount:  doc.commentsCount  || 0,
        repostCount:    doc.repostCount    || 0,
        uniqueReactors: doc.uniqueReactors || 0,
        isRepost:       doc.isRepost       || false,
        originalPostId: doc.originalPostId || null,
        originalAuthor: doc.originalAuthor || null,
        repostComment:  doc.repostComment  || null,
        visibilityScore: liveScore,
        timestamp:      doc.timestamp,
        createdAt:      doc.createdAt,
      };
    });

    enriched.sort((a, b) => b.visibilityScore - a.visibilityScore);
    return enriched.slice(0, limit);
  } catch { return []; }
}

export async function pollActivityFeed(_userId: string, since: number) {
  try {
    const posts = (await getDb()).collection("guild_posts");
    const docs  = await posts
      .find({ isDeleted: false, timestamp: { $gt: since } })
      .sort({ timestamp: 1 }).limit(50).toArray();
    if (!docs.length) return [];

    const uniqueGuildIds = [...new Set(docs.map((d) => d.guildId as string).filter(Boolean))];
    const guilds    = await getGuildsByIds(uniqueGuildIds);
    const guildMap  = Object.fromEntries(guilds.map((g) => [g.id, g]));

    return docs.map((doc) => {
      const guild = guildMap[doc.guildId as string] || {};
      return {
        id:             doc._id.toString(),
        guildId:        doc.guildId,
        guildName:      (guild as { name?: string }).name      || "Unknown Guild",
        guildLogoUrl:   (guild as { logoUrl?: string }).logoUrl || null,
        userId:         doc.userId,
        username:       doc.username,
        userAvatar:     doc.userAvatar  || null,
        description:    doc.description,
        imageUrl:       doc.imageUrl    || null,
        reactionCounts: doc.reactionCounts || {},
        commentsCount:  doc.commentsCount  || 0,
        repostCount:    doc.repostCount    || 0,
        uniqueReactors: doc.uniqueReactors || 0,
        isRepost:       doc.isRepost       || false,
        originalPostId: doc.originalPostId || null,
        originalAuthor: doc.originalAuthor || null,
        visibilityScore: computeVisibilityScore(doc as Record<string, unknown>),
        timestamp:      doc.timestamp,
        createdAt:      doc.createdAt,
      };
    });
  } catch { return []; }
}

export async function getGovernanceFeed(_userId: string) {
  try {
    const linked = await import("./guild-service").then((m) => m.getAllLinkedDaoGuilds());
    if (!linked.length) return { linkedDAOs: [] };
    return {
      linkedDAOs: linked.map((g) => ({
        guildId:    g.id,
        guildName:  g.name,
        guildLogo:  g.logoUrl || null,
        daoAddress: g.linkedDaoAddress,
        chainId:    g.linkedDaoChainId,
      })),
    };
  } catch { return { linkedDAOs: [] }; }
}
