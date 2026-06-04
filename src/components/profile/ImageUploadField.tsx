"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadAvatar, uploadBanner } from "@/app/account/profile-actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large (max 5 MB).");
      return;
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
    ? "Square image recommended · JPEG, PNG, WebP · max 5 MB"
    : "Wide image recommended (e.g. 1200 × 400) · JPEG, PNG, WebP · max 5 MB";

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
        accept={ALLOWED_TYPES.join(",")}
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
