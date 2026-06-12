import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { leaveGuild } from "@/lib/guild-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    await leaveGuild(params.guildId, auth.uid);
    return ok({ left: true });
  } catch (err) {
    const msg = String(err);
    const status = msg.includes("not found") ? 404 : msg.includes("Owner") ? 403 : 500;
    return Response.json({ success: false, error: msg }, { status });
  }
}
