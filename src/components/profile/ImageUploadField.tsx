"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadAvatar, uploadBanner } from "@/app/account/profile-actions";

// Accepted types shown in the file picker. HEIC/HEIF are added for iOS camera
// roll. The browser may still report an empty mime type for HEIC on some
// devices — we handle that in convertToJpeg below.
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp,.gif";

// 10 MB hard limit — matches the server-side check and next.config bodySizeLimit.
const MAX_BYTES = 10 * 1024 * 1024;

// After canvas conversion we target ≤ 1.4 MB JPEG so we stay well under
// the server-action body limit even with FormData overhead.
const TARGET_BYTES = 1.4 * 1024 * 1024;
const MAX_DIMENSION = 1600; // px — enough for a profile photo or banner

/**
 * Convert any image file to a JPEG Blob via an HTMLCanvasElement.
 * This handles:
 *  - HEIC/HEIF: Safari on iOS can decode these via drawImage even though
 *    they aren't natively displayable in an <img>. The canvas re-encodes
 *    them as standard JPEG.
 *  - Large files: iteratively lowers quality until the result is ≤ TARGET_BYTES.
 *  - Returns null if conversion fails (caller should show an error).
 */
async function convertToJpeg(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down if larger than MAX_DIMENSION on either axis
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(null); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Iteratively lower quality until result fits TARGET_BYTES
      let quality = 0.88;
      const tryEncode = () => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(null); return; }
          if (blob.size > TARGET_BYTES && quality > 0.3) {
            quality -= 0.1;
            tryEncode();
            return;
          }
          const converted = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, "") + ".jpg",
            { type: "image/jpeg" }
          );
          resolve(converted);
        }, "image/jpeg", quality);
      };
      tryEncode();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}

/** Returns true for types that need canvas conversion before upload. */
function needsConversion(file: File): boolean {
  // HEIC: mime type may be "image/heic", "image/heif", or "" on some browsers
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  if (/\.heic$/i.test(file.name) || /\.heif$/i.test(file.name)) return true;
  // Large files benefit from resizing too
  if (file.size > TARGET_BYTES) return true;
  return false;
}

interface ImageUploadFieldProps {
  kind: "avatar" | "banner";
  currentUrl: string | null;
  displayName: string;
  /** Called with the new public URL after a successful upload */
  onUploaded?: (url: string) => void;
}

export default function ImageUploadField({
  kind,
  currentUrl,
  displayName,
  onUploaded,
}: ImageUploadFieldProps) {
  const [preview, setPreview]   = useState<string | null>(currentUrl);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    if (!raw) return;

    setError(null);
    setSuccess(false);

    // Basic size guard before conversion attempt
    if (raw.size > MAX_BYTES) {
      setError("File is too large (max 10 MB).");
      return;
    }

    // Convert to JPEG if needed (HEIC, or >TARGET_BYTES)
    let file: File = raw;
    if (needsConversion(raw)) {
      const converted = await convertToJpeg(raw);
      if (!converted) {
        setError("Could not process this image. Please try a JPEG or PNG.");
        return;
      }
      file = converted;
    }

    // Optimistic local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    const fd = new FormData();
    fd.set("file", file);

    startTransition(async () => {
      const action = kind === "avatar" ? uploadAvatar : uploadBanner;
      const result = await action(fd);
      if (result.error) {
        setError(result.error);
        setPreview(currentUrl); // revert preview on failure
      } else if (result.url) {
        setSuccess(true);
        onUploaded?.(result.url);
      }
    });
  }

  const isAvatar = kind === "avatar";
  const label    = isAvatar ? "Profile photo" : "Banner image";
  const hint     = isAvatar
    ? "Square image recommended · JPEG, PNG, WebP, HEIC · max 10 MB"
    : "Wide image recommended (e.g. 1200 × 400) · JPEG, PNG, WebP, HEIC · max 10 MB";

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </p>

      {/* Preview */}
      <div className="mt-2">
        {isAvatar ? (
          <div
            className="ink-card relative h-16 w-16 cursor-pointer overflow-hidden rounded-full bg-brand-blue"
            onClick={() => inputRef.current?.click()}
            title="Click to upload"
          >
            {preview ? (
              <Image src={preview} alt="Avatar preview" fill sizes="64px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-2xl text-white select-none">
                {displayName.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>
        ) : (
          <div
            className="relative h-24 w-full cursor-pointer overflow-hidden rounded-xl border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800"
            onClick={() => inputRef.current?.click()}
            title="Click to upload"
          >
            {preview ? (
              <Image src={preview} alt="Banner preview" fill sizes="600px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                Click to upload banner
              </span>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="mt-2 text-xs text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-100"
      >
        {isPending ? "Uploading…" : "Change photo"}
      </button>

      {hint && (
        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}

      {error   && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {success && <p className="mt-1 text-xs text-brand-green">Saved!</p>}
    </div>
  );
}
