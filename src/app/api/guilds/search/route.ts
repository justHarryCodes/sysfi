export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/firebase-auth";
import { searchGuilds } from "@/lib/guild-service";

export async function GET(req: NextRequest) {
  try {
    const q     = req.nextUrl.searchParams.get("q");
    const genre = req.nextUrl.searchParams.get("genre");
    if (!q?.trim()) return ok([]);
    return ok(await searchGuilds(q.trim(), genre || null));
  } catch (err) {
    console.error("GET /api/guilds/search:", err);
    return serverError();
  }
}
