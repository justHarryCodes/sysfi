export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/firebase-auth";
import { getInviteByCode } from "@/lib/guild-service";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  try {
    const invite = await getInviteByCode(params.code);
    if (!invite) return Response.json({ success: false, error: "Invite not found or expired" }, { status: 404 });
    return ok(invite);
  } catch (err) {
    console.error("GET /api/guilds/invite/[code]:", err);
    return serverError();
  }
}
