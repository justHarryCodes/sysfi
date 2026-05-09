/**
 * Client-side image compression using the Canvas API.
 * Images are compressed and resized before being stored as base64 in MongoDB.
 *
 * Limits:
 *   logo   → max 240×240 px,  JPEG quality 0.70  (~15–30 KB base64)
 *   banner → max 840×280 px,  JPEG quality 0.70  (~40–90 KB base64)
 *
 * These produce totals well under MongoDB's 16 MB document limit.
 */

export type ImageType = "logo" | "banner";

interface CompressionConfig {
  maxWidth:  number;
  maxHeight: number;
  quality:   number;
  maxBytes:  number;   // reject the original file if it's wildly oversized
}

const CONFIG: Record<ImageType, CompressionConfig> = {
  logo:   { maxWidth: 240, maxHeight: 240, quality: 0.70, maxBytes: 10 * 1024 * 1024 },
  banner: { maxWidth: 840, maxHeight: 280, quality: 0.70, maxBytes: 10 * 1024 * 1024 },
};

export const RECOMMENDED_DIMENSIONS: Record<ImageType, string> = {
  logo:   "Square (1:1) — shown as 48×48 px on cards",
  banner: "3:1 ratio — shown as 840×280 px on cards",
};

/** Validate file type and raw file size before compressing. */
export function validateImageFile(file: File, type: ImageType): string | null {
  if (!file.type.startsWith("image/")) return "File must be an image.";
  if (file.size > CONFIG[type].maxBytes)
    return `File is too large (max ${CONFIG[type].maxBytes / 1024 / 1024} MB).`;
  return null;
}

/**
 * Compress + resize an image file and return a JPEG data URL.
 * Runs entirely in the browser — nothing is uploaded to any CDN.
 */
export async function compressImage(file: File, type: ImageType): Promise<string> {
  const { maxWidth, maxHeight, quality } = CONFIG[type];

  return new Promise<string>((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Compute scaled dimensions (maintain aspect ratio, fit within max box)
      let { width, height } = img;
      const ratio = Math.min(
        width  > maxWidth  ? maxWidth  / width  : 1,
        height > maxHeight ? maxHeight / height : 1,
      );
      width  = Math.round(width  * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas 2D context unavailable.")); return; }

      // White background for transparent PNGs
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode image."));
    };

    img.src = objectUrl;
  });
}

/** Approximate size of a base64 data URL in bytes. */
export function base64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

/** Human-readable byte count. */
export function prettyBytes(bytes: number): string {
  if (bytes < 1024)       return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
