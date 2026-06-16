"use client";

/**
 * Client-side gallery for a ready Printful mockup that has multiple style
 * variants (e.g. lifestyle / flat / zoomed). Renders the active mockup as the
 * main image with a clickable thumbnail strip below — same interaction pattern
 * as the owner-side DesignImageSection.
 *
 * ProductMockup (a server component) delegates to this only when there is more
 * than one mockup URL, so the common single-image case stays server-rendered.
 */

import Image from "next/image";
import { useState } from "react";

interface MockupGalleryProps {
  urls: string[];
  alt: string;
  wrapperClass: string;
  sizes: string;
  loading?: "lazy" | "eager";
}

export default function MockupGallery({
  urls,
  alt,
  wrapperClass,
  sizes,
  loading = "lazy",
}: MockupGalleryProps) {
  const [active, setActive] = useState(0);
  const activeUrl = urls[active] ?? urls[0];

  return (
    <div>
      <div className={`${wrapperClass} bg-zinc-50 dark:bg-zinc-800`}>
        <Image
          src={activeUrl}
          alt={alt}
          fill
          sizes={sizes}
          loading={loading}
          className="object-contain"
        />
      </div>

      <div className="mt-3 flex gap-2">
        {urls.map((url, idx) => (
          <button
            key={url}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={`Mockup ${idx + 1}`}
            aria-pressed={idx === active}
            className={`overflow-hidden rounded-lg border transition-colors ${
              idx === active
                ? "border-zinc-900 dark:border-zinc-100"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
            }`}
          >
            <Image
              src={url}
              alt={`Mockup ${idx + 1} thumbnail`}
              width={72}
              height={72}
              className="block h-16 w-16 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
