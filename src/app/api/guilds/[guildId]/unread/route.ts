import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getUnreadCount } from "@/lib/guild-service";

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok({ count: await getUnreadCount(params.guildId, auth.uid) });
  } catch (err) {
    return serverError(String(err));
  }
}
