/**
 * Cloudinary upload helper.
 * Files are sent to /api/images/upload (our signed server route).
 * The API secret never touches the browser.
 */

export type UploadType = "logo" | "banner" | "dao" | "token" | "general";

export interface CloudinaryResult {
  url:      string;
  publicId: string;
  width:    number;
  height:   number;
  format?:  string;
}

/** Max file sizes shown in UI validation (server enforces the same) */
const MAX_BYTES: Record<UploadType, number> = {
  logo:    2 * 1024 * 1024,
  banner:  5 * 1024 * 1024,
  dao:     5 * 1024 * 1024,
  token:   2 * 1024 * 1024,
  general: 10 * 1024 * 1024,
};

/** Recommended dimensions for UI hints */
export const RECOMMENDED: Record<UploadType, string> = {
  logo:    "400×400 px, square",
  banner:  "1200×400 px, 3:1 ratio",
  dao:     "400×400 px, square",
  token:   "200×200 px, square",
  general: "Any size",
};

export function validateImage(file: File, type: UploadType): string | null {
  if (!file.type.startsWith("image/")) return "File must be an image";
  if (file.size > MAX_BYTES[type])
    return `File too large (max ${MAX_BYTES[type] / 1024 / 1024} MB)`;
  return null;
}

/**
 * Upload an image via our signed server route.
 * Works in both browser and server contexts.
 */
export async function uploadToCloudinary(
  file:   File,
  type:   UploadType = "general",
  folder: string = "launchpad",
): Promise<CloudinaryResult> {
  const error = validateImage(file, type);
  if (error) throw new Error(error);

  const form = new FormData();
  form.append("file",   file);
  form.append("type",   type);
  form.append("folder", folder);

  const res = await fetch("/api/images/upload", { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `Upload failed (${res.status})`);
  }

  return {
    url:      data.url,
    publicId: data.publicId,
    width:    data.width,
    height:   data.height,
    format:   data.format,
  };
}

/** Always true now — credentials are server-side env vars */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    typeof window !== "undefined"
  );
}
