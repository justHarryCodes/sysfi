import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, badRequest, ok, serverError } from "@/lib/firebase-auth";
import { sendMessage, getMessages } from "@/lib/guild-mongo";
import { getGuildById, getChatSettings, getMembers, incrementUnread } from "@/lib/guild-service";

type P = { params: { guildId: string } };

export async function GET(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const limit  = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "30"), 100);
    const before = req.nextUrl.searchParams.get("before");
    return ok(await getMessages(params.guildId, { limit, before }));
  } catch (err) {
    return serverError(String(err));
  }
}

export async function POST(req: NextRequest, { params }: P) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const { guildId } = params;
    const { text, username, displayName, userAvatar, replyTo } = await req.json();
    if (!text?.trim()) return badRequest("Message text is required");

    const [settings, guild] = await Promise.all([getChatSettings(guildId), getGuildById(guildId)]);
    const isAdmin = guild?.createdBy === auth.uid;

    const s = settings as { is_locked?: boolean; isLocked?: boolean; message_delay?: number; messageDelay?: number };
    if ((s.is_locked || s.isLocked) && !isAdmin) {
      return Response.json({ success: false, error: "Chat is currently locked" }, { status: 403 });
    }

    const message = await sendMessage(guildId, { userId: auth.uid, username, displayName, userAvatar, text, replyTo });

    // Increment unread for all other members (fire-and-forget)
    getMembers(guildId).then((members) => {
      const others = members.filter((m: Record<string, unknown>) => m.userId !== auth.uid);
      Promise.all(others.map((m: Record<string, unknown>) => incrementUnread(guildId, m.userId as string))).catch(() => {});
    }).catch(() => {});

    return ok(message);
  } catch (err) {
    return serverError(String(err));
  }
}
