import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getMessagesSince } from "@/lib/guild-mongo";
import { resetUnread } from "@/lib/guild-service";

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    const since    = parseInt(req.nextUrl.searchParams.get("since") ?? "0");
    const messages = await getMessagesSince(params.guildId, since);
    if (messages.length > 0) resetUnread(params.guildId, auth.uid).catch(() => {});
    return ok(messages);
  } catch (err) {
    return serverError(String(err));
  }
}
