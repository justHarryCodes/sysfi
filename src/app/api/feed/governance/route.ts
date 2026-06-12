export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { verifyFirebaseToken, unauthorized, ok, serverError } from "@/lib/firebase-auth";
import { getGovernanceFeed } from "@/lib/feed-service";

export async function GET(req: NextRequest) {
  const auth = await verifyFirebaseToken(req);
  if (!auth) return unauthorized();

  try {
    return ok(await getGovernanceFeed(auth.uid));
  } catch (err) {
    console.error("GET /api/feed/governance:", err);
    return serverError();
  }
}
