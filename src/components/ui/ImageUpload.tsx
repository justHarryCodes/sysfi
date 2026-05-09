"use client";

import { useState, useCallback } from "react";
import { useDropzone }           from "react-dropzone";
import { Upload, X, Loader2, ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import {
  compressImage, validateImageFile, prettyBytes, base64Bytes,
  RECOMMENDED_DIMENSIONS, type ImageType,
} from "@/lib/imageUtils";

interface ImageUploadProps {
  type:       ImageType;
  value?:     string;          // current data URL (if already uploaded)
  onChange:   (dataUrl: string) => void;
  className?: string;
  label?:     string;
}

const ASPECT: Record<ImageType, string> = {
  logo:   "aspect-square max-w-[160px]",
  banner: "aspect-[3/1] w-full",
};

export default function ImageUpload({ type, value, onChange, className = "", label }: ImageUploadProps) {
  const [compressing, setCompressing] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [size,        setSize]        = useState<string | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    const err = validateImageFile(file, type);
    if (err) { setError(err); return; }

    setError(null);
    setCompressing(true);

    try {
      const dataUrl = await compressImage(file, type);
      const bytes   = base64Bytes(dataUrl);
      setSize(prettyBytes(bytes));
      onChange(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compression failed");
    } finally {
      setCompressing(false);
    }
  }, [type, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] },
    maxFiles: 1,
    disabled: compressing,
  });

  return (
    <div className={className}>
      {label && (
        <p className="text-xs font-mono text-text-secondary mb-1 uppercase tracking-wider">{label}</p>
      )}
      <p className="text-[11px] text-text-muted font-mono mb-2">
        {RECOMMENDED_DIMENSIONS[type]}
      </p>

      {value ? (
        /* Preview */
        <div className={`relative rounded-xl overflow-hidden border ${ASPECT[type]}`}
          style={{ borderColor: "rgba(0,255,135,0.2)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={type} className="w-full h-full object-cover" />

          {/* Size badge */}
          {size && (
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono"
              style={{ background: "rgba(0,0,0,0.7)", color: "var(--neon-green)" }}>
              <CheckCircle size={9} />
              {size}
            </div>
          )}

          {/* Remove */}
          <button
            onClick={() => { onChange(""); setSize(null); }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,45,120,0.85)", border: "1px solid rgba(255,45,120,0.5)" }}>
            <X size={12} color="#fff" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div {...getRootProps()}
          className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${ASPECT[type]}`}
          style={{
            borderColor: isDragActive ? "var(--neon-green)" : "rgba(0,212,255,0.2)",
            background:  isDragActive ? "rgba(0,255,135,0.05)" : "rgba(0,0,0,0.3)",
          }}>
          <input {...getInputProps()} />
          {compressing ? (
            <>
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--neon-blue)" }} />
              <p className="text-[11px] font-mono text-text-muted">Compressing…</p>
            </>
          ) : (
            <>
              {isDragActive
                ? <Upload size={20} style={{ color: "var(--neon-green)" }} />
                : <ImageIcon size={18} style={{ color: "var(--neon-blue)" }} />}
              <p className="text-[11px] font-mono text-center px-3" style={{ color: "var(--neon-blue)" }}>
                {isDragActive ? "Drop it!" : "Drop or click to upload"}
              </p>
              <p className="text-[10px] font-mono text-text-muted">Stored in MongoDB · No CDN needed</p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[11px] font-mono flex items-center gap-1" style={{ color: "#ff2d78" }}>
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}
