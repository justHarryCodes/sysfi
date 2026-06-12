/**
 * Signed Cloudinary upload proxy.
 * The API secret never leaves the server.
 *
 * POST /api/images/upload
 * Body: multipart/form-data with fields:
 *   file     – the image file
 *   type     – "logo" | "banner" | "dao" | "token" (optional, defaults to "general")
 *   folder   – sub-folder override (optional)
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME  ?? "";
const KEY    = process.env.CLOUDINARY_API_KEY      ?? "";
const SECRET = process.env.CLOUDINARY_API_SECRET   ?? "";

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`;

const TRANSFORMATIONS: Record<string, string> = {
  logo:   "w_400,h_400,c_fill,g_auto,q_auto,f_auto",
  banner: "w_1200,h_400,c_fill,g_auto,q_auto,f_auto",
  dao:    "w_400,h_400,c_fill,g_auto,q_auto,f_auto",
  token:  "w_200,h_200,c_fill,g_auto,q_auto,f_auto",
  general:"q_auto,f_auto",
};

const MAX_BYTES: Record<string, number> = {
  logo:    2 * 1024 * 1024,
  banner:  5 * 1024 * 1024,
  dao:     5 * 1024 * 1024,
  token:   2 * 1024 * 1024,
  general: 10 * 1024 * 1024,
};

function sign(params: Record<string, string>): string {
  // Sort params alphabetically, join as k=v&k=v, append secret
  const str =
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + SECRET;

  return crypto.createHash("sha1").update(str).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!CLOUD || !KEY || !SECRET) {
    return NextResponse.json(
      { success: false, error: "Cloudinary not configured on server" },
      { status: 500 },
    );
  }

  try {
    const formData = await req.formData();
    const file   = formData.get("file") as File | null;
    const type   = (formData.get("type") as string) ?? "general";
    const folder = (formData.get("folder") as string) ?? `launchpad/${type}s`;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "File must be an image" }, { status: 400 });
    }

    const maxBytes = MAX_BYTES[type] ?? MAX_BYTES.general;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { success: false, error: `File too large (max ${maxBytes / 1024 / 1024} MB for ${type})` },
        { status: 400 },
      );
    }

    const timestamp  = String(Math.round(Date.now() / 1000));
    const eager      = TRANSFORMATIONS[type] ?? TRANSFORMATIONS.general;

    const sigParams: Record<string, string> = {
      eager,
      folder,
      timestamp,
    };

    const signature = sign(sigParams);

    const upload = new FormData();
    upload.append("file",      file);
    upload.append("api_key",   KEY);
    upload.append("timestamp", timestamp);
    upload.append("signature", signature);
    upload.append("folder",    folder);
    upload.append("eager",     eager);

    const res = await fetch(UPLOAD_URL, { method: "POST", body: upload });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error?.message ?? `Upload failed (${res.status})` },
        { status: res.status },
      );
    }

    const eager_result = data.eager?.[0];

    return NextResponse.json({
      success:  true,
      url:      eager_result?.secure_url ?? data.secure_url,
      publicId: data.public_id,
      width:    eager_result?.width  ?? data.width,
      height:   eager_result?.height ?? data.height,
      format:   data.format,
    });
  } catch (err) {
    console.error("POST /api/images/upload:", err);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 },
    );
  }
}
