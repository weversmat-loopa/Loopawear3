import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DesignEditForm from "./DesignEditForm";
import {
  startImageGeneration,
  devMarkGenerationReady,
  devMarkGenerationFailed,
} from "@/app/account/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: "Design" };

  const { data: design } = await supabase
    .from("designs")
    .select("product_type")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) return { title: "Design" };

  return {
    title: design.product_type ? `${design.product_type} Design` : "Design",
    robots: { index: false },
  };
}

export default async function OwnerDesignPage({ params, searchParams }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: design } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, status, image_status, image_url, created_at")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) {
    notFound();
  }

  const sp = await searchParams;
  const success = sp?.success;
  const error = sp?.error;

  const isPublished = design.status === "published";
  const canGenerate =
    design.image_status === "none" ||
    design.image_status === null ||
    design.image_status === "failed";

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/account"
          className="text-sm text-zinc-500 transition-colors hover:text-white"
        >
          ← Your account
        </Link>

        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                isPublished
                  ? "border-zinc-600 text-zinc-400"
                  : "border-zinc-800 text-zinc-500"
              }`}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            Edit design
          </h1>

          <div className="mt-8">
            {design.image_status === "ready" && design.image_url ? (
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={design.image_url}
                  alt="Generated design"
                  className="w-full"
                />
              </div>
            ) : design.image_status === "generating" ? (
              <div className="flex aspect-square w-full animate-pulse items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">
                    Generating image…
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">
                    This may take a moment.
                  </p>
                </div>
              </div>
            ) : design.image_status === "failed" ? (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950">
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    Generation failed
                  </p>
                  <p className="mt-1 text-xs text-zinc-700">
                    Something went wrong. You can try again below.
                  </p>
                </div>
              </div>
            ) : design.image_status === "ready" && !design.image_url ? (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950">
                <p className="text-sm text-zinc-600">Image unavailable</p>
              </div>
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950">
                <p className="text-sm text-zinc-600">No image generated yet</p>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <form action={startImageGeneration}>
                <input type="hidden" name="designId" value={design.id} />
                <button
                  type="submit"
                  disabled={!canGenerate}
                  className={`rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity ${
                    canGenerate
                      ? "hover:opacity-75"
                      : "cursor-not-allowed opacity-40"
                  }`}
                >
                  {design.image_status === "failed"
                    ? "Retry generation"
                    : design.image_status === "generating"
                      ? "Generating…"
                      : "Generate image"}
                </button>
              </form>
              {canGenerate && (
                <p className="text-xs text-zinc-600">
                  Generates a unique AI image for this design based on your
                  prompt, product type, and style.
                </p>
              )}
            </div>
          </div>

          {design.image_status === "generating" && (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-800 px-4 py-3">
              <p className="text-xs text-zinc-700">
                Dev — simulate generation result
              </p>
              <div className="mt-2.5 flex gap-2">
                <form action={devMarkGenerationReady}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                  >
                    Mark ready
                  </button>
                </form>
                <form action={devMarkGenerationFailed}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                  >
                    Mark failed
                  </button>
                </form>
              </div>
            </div>
          )}

          {success && (
            <p className="mt-6 text-sm text-green-400">{success}</p>
          )}
          {error && (
            <p className="mt-6 text-sm text-red-400">{error}</p>
          )}

          <DesignEditForm
            designId={design.id}
            initialPrompt={design.prompt}
            initialProductType={design.product_type}
            initialStyle={design.style}
          />

          <p className="mt-10 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
            Created {formatDate(design.created_at)}
          </p>
        </div>
      </div>
    </main>
  );
}
