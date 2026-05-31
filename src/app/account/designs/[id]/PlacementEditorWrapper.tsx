"use client";

import dynamic from "next/dynamic";

const PlacementEditor = dynamic(
  () => import("@/app/generate/PlacementEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-12 border-t border-zinc-100 pt-12 dark:border-zinc-800">
        <div className="h-6 w-40 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="mt-4 h-[480px] w-[400px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      </div>
    ),
  }
);

export default function PlacementEditorWrapper({
  imageUrl,
  designId,
}: {
  imageUrl: string;
  designId: string;
}) {
  return <PlacementEditor imageUrl={imageUrl} designId={designId} />;
}
