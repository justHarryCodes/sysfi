export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { resetUnread } from "@/lib/guild-service";

export async function POST(req: NextRequest, { params }: { params: { guildId: string } }) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();
  try {
    await resetUnread(params.guildId, auth.uid);
    return ok({ reset: true });
  } catch (err) {
    return serverError(String(err));
  }
}
