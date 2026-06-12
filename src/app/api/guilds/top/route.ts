import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/firebase-auth";
import { getTopGuilds } from "@/lib/guild-service";

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "10"), 50);
    return ok(await getTopGuilds(limit));
  } catch (err) {
    console.error("GET /api/guilds/top:", err);
    return serverError();
  }
}
