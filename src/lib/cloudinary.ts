// ─── Cloudinary unsigned upload ───────────────────────────────────────────────
//
// Setup:
//  1. Create account at https://cloudinary.com (free tier is plenty)
//  2. Dashboard → Settings → Upload → "Add upload preset" → set to Unsigned
//  3. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
//

export type UploadType = "logo" | "banner";

export interface CloudinaryResult {
  url:       string;  // https CDN URL
  publicId:  string;
  width:     number;
  height:    number;
}

const CLOUD  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   ?? "";
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

/** Max file sizes */
const MAX_BYTES: Record<UploadType, number> = {
  logo:   2 * 1024 * 1024,   // 2 MB
  banner: 5 * 1024 * 1024,   // 5 MB
};

/** Recommended dimensions (shown in UI) */
export const RECOMMENDED: Record<UploadType, string> = {
  logo:   "400×400 px, square",
  banner: "1200×400 px, 3:1 ratio",
};

export function validateImage(file: File, type: UploadType): string | null {
  if (!file.type.startsWith("image/")) return "File must be an image";
  if (file.size > MAX_BYTES[type])
    return `File too large (max ${MAX_BYTES[type] / 1024 / 1024} MB)`;
  return null;
}

export async function uploadToCloudinary(
  file:   File,
  type:   UploadType,
  folder: string = "launchpad"
): Promise<CloudinaryResult> {
  if (!CLOUD || !PRESET) {
    throw new Error(
      "Cloudinary not configured — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local"
    );
  }

  const error = validateImage(file, type);
  if (error) throw new Error(error);

  const form = new FormData();
  form.append("file",           file);
  form.append("upload_preset",  PRESET);
  form.append("folder",         `${folder}/${type}s`);
  // Enforce dimensions server-side
  if (type === "logo")   form.append("transformation", "w_400,h_400,c_fill,g_auto");
  if (type === "banner") form.append("transformation", "w_1200,h_400,c_fill,g_auto");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return {
    url:      data.secure_url,
    publicId: data.public_id,
    width:    data.width,
    height:   data.height,
  };
}

export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD && PRESET &&
    CLOUD  !== "your_cloud_name" &&
    PRESET !== "your_unsigned_preset");
}
