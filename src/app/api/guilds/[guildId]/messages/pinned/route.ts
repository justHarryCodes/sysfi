import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getPinnedMessages } from "@/lib/guild-mongo";

export async function GET(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    return ok(await getPinnedMessages(params.guildId));
  } catch (err) {
    return serverError(String(err));
  }
}
