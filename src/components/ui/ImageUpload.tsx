"use client";

import { useState, useCallback } from "react";
import { useDropzone }           from "react-dropzone";
import { Upload, X, Loader2, ImageIcon, CheckCircle, AlertCircle } from "lucide-react";

export type ImageUploadType = "logo" | "banner" | "dao" | "token" | "general";

interface ImageUploadProps {
  type:       ImageUploadType;
  value?:     string;           // current URL or data URL
  onChange:   (url: string) => void;
  className?: string;
  label?:     string;
}

const ASPECT: Record<ImageUploadType, string> = {
  logo:    "aspect-square max-w-[160px]",
  banner:  "aspect-[3/1] w-full",
  dao:     "aspect-square max-w-[160px]",
  token:   "aspect-square max-w-[120px]",
  general: "aspect-video w-full",
};

const HINTS: Record<ImageUploadType, string> = {
  logo:    "Square (1:1) — shown as 48×48 px on cards",
  banner:  "3:1 ratio — shown as 840×280 px on cards",
  dao:     "Square (1:1) — DAO profile image",
  token:   "Square (1:1) — token icon",
  general: "Any ratio",
};

const MAX_MB: Record<ImageUploadType, number> = {
  logo:    2,
  banner:  5,
  dao:     5,
  token:   2,
  general: 10,
};

export default function ImageUpload({
  type,
  value,
  onChange,
  className = "",
  label,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        setError("File must be an image");
        return;
      }
      if (file.size > MAX_MB[type] * 1024 * 1024) {
        setError(`File too large (max ${MAX_MB[type]} MB)`);
        return;
      }

      setError(null);
      setUploading(true);

      try {
        const form = new FormData();
        form.append("file",   file);
        form.append("type",   type);
        form.append("folder", "launchpad");

        const res  = await fetch("/api/images/upload", { method: "POST", body: form });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Upload failed");
        }

        onChange(data.url as string);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [type, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className={className}>
      {label && (
        <p className="text-xs font-mono text-text-secondary mb-1 uppercase tracking-wider">
          {label}
        </p>
      )}
      <p className="text-[11px] text-text-muted font-mono mb-2">{HINTS[type]}</p>

      {value ? (
        <div
          className={`relative rounded-xl overflow-hidden border ${ASPECT[type]}`}
          style={{ borderColor: "rgba(0,255,135,0.2)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={type} className="w-full h-full object-cover" />

          <div
            className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
            style={{ background: "rgba(0,0,0,0.7)", color: "var(--neon-green)" }}
          >
            <CheckCircle size={9} />
            Uploaded
          </div>

          <button
            onClick={() => onChange("")}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,45,120,0.85)",
              border: "1px solid rgba(255,45,120,0.5)",
            }}
          >
            <X size={12} color="#fff" />
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${ASPECT[type]}`}
          style={{
            borderColor: isDragActive ? "var(--neon-green)" : "rgba(0,212,255,0.2)",
            background:  isDragActive ? "rgba(0,255,135,0.05)" : "rgba(0,0,0,0.3)",
          }}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--neon-blue)" }} />
              <p className="text-[11px] font-mono text-text-muted">Uploading…</p>
            </>
          ) : (
            <>
              {isDragActive ? (
                <Upload size={20} style={{ color: "var(--neon-green)" }} />
              ) : (
                <ImageIcon size={18} style={{ color: "var(--neon-blue)" }} />
              )}
              <p
                className="text-[11px] font-mono text-center px-3"
                style={{ color: "var(--neon-blue)" }}
              >
                {isDragActive ? "Drop it!" : "Drop or click to upload"}
              </p>
              <p className="text-[10px] font-mono text-text-muted">
                Stored on Cloudinary CDN
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p
          className="mt-1.5 text-[11px] font-mono flex items-center gap-1"
          style={{ color: "#ff2d78" }}
        >
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}
