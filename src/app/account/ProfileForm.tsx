"use client";

import { useTransition, useState } from "react";
import Input from "@/components/ui/Input";

type Props = {
  displayName: string;
  bio: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
};

export default function ProfileForm({
  displayName,
  bio,
  websiteUrl,
  instagramUrl,
  tiktokUrl,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Controlled state so values persist after save
  const [values, setValues] = useState({
    display_name: displayName,
    bio: bio,
    website_url: websiteUrl,
    instagram_url: instagramUrl,
    tiktok_url: tiktokUrl,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    startTransition(async () => {
      const result = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }).then((r) => r.json() as Promise<{ success?: string; error?: string }>);
      setStatus(result);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Name */}
      <div className="px-5 py-4">
        <label
          htmlFor="display_name"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          Name
        </label>
        <div className="mt-2">
          <Input
            id="display_name"
            name="display_name"
            type="text"
            value={values.display_name}
            onChange={handleChange}
            placeholder="Your display name"
            autoComplete="name"
          />
        </div>
      </div>

      {/* Bio */}
      <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <label
          htmlFor="bio"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          Bio
        </label>
        <div className="mt-2">
          <textarea
            id="bio"
            name="bio"
            rows={3}
            value={values.bio}
            onChange={handleChange}
            placeholder="A short intro about you…"
            maxLength={300}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-paper px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-violet-400/60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Optional · max 300 characters
          </p>
        </div>
      </div>

      {/* Social links */}
      <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Social links
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="website_url" className="text-xs text-zinc-500 dark:text-zinc-400">
              Website
            </label>
            <Input
              id="website_url"
              name="website_url"
              type="url"
              value={values.website_url}
              onChange={handleChange}
              placeholder="https://yourwebsite.com"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="instagram_url" className="text-xs text-zinc-500 dark:text-zinc-400">
              Instagram
            </label>
            <Input
              id="instagram_url"
              name="instagram_url"
              type="url"
              value={values.instagram_url}
              onChange={handleChange}
              placeholder="https://instagram.com/handle"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="tiktok_url" className="text-xs text-zinc-500 dark:text-zinc-400">
              TikTok
            </label>
            <Input
              id="tiktok_url"
              name="tiktok_url"
              type="url"
              value={values.tiktok_url}
              onChange={handleChange}
              placeholder="https://tiktok.com/@handle"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Save row */}
      <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            {status?.success && (
              <p className="text-sm text-green-600">{status.success}</p>
            )}
            {status?.error && (
              <p className="text-sm text-red-600">{status.error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </form>
  );
}
