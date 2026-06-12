export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  try {
    await (await getDb()).command({ ping: 1 });
    return NextResponse.json({ ok: true, uptime: process.uptime(), db: "mongodb" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 503 });
  }
}
