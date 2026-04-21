import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DesignEditForm from "./DesignEditForm";
import DesignImageSection from "./DesignImageSection";
import {
  publishDraft,
  unpublishDesign,
  devMarkGenerationReady,
  devMarkGenerationFailed,
  devSetTestImageUrl,
  devClearImageUrl,
} from "@/app/account/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string; color_palette?: string }>;
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
  const colorPalette = sp?.color_palette ?? null;

  const isPublished = design.status === "published";

  const refineParams = new URLSearchParams({ prompt: design.prompt, design_id: design.id });
  if (design.product_type) refineParams.set("product_type", design.product_type);
  if (design.style) refineParams.set("style", design.style);
  if (colorPalette) refineParams.set("color_palette", colorPalette);
  const refineHref = `/generate?${refineParams.toString()}`;

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
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                isPublished
                  ? "border-zinc-600 text-zinc-400"
                  : "border-zinc-800 text-zinc-500"
              }`}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
            {!isPublished && design.image_status === "ready" && (
              <form action={publishDraft}>
                <input type="hidden" name="designId" value={design.id} />
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-1 text-xs font-semibold text-black transition-opacity hover:opacity-75"
                >
                  Publish →
                </button>
              </form>
            )}
            {isPublished && (
              <>
                <Link
                  href={`/marketplace/${design.id}`}
                  className="text-xs text-zinc-400 transition-colors hover:text-white"
                >
                  View on marketplace ↗
                </Link>
                <form action={unpublishDesign}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-700 px-4 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
                  >
                    Unpublish
                  </button>
                </form>
              </>
            )}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">
            {design.product_type ? `${design.product_type} Design` : "Design"}
          </h1>

          <div className="mt-8">
            <DesignImageSection
              designId={design.id}
              imageStatus={design.image_status}
              imageUrl={design.image_url}
              productType={design.product_type}
              colorPalette={colorPalette}
              refineHref={refineHref}
            />
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

          {design.image_status !== "generating" && (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-800 px-4 py-3">
              <p className="text-xs text-zinc-700">Dev — test image URL</p>
              <form action={devSetTestImageUrl} className="mt-2.5 flex gap-2">
                <input type="hidden" name="designId" value={design.id} />
                <input
                  name="image_url"
                  type="url"
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-transparent px-3 py-1.5 text-xs text-zinc-400 outline-none placeholder:text-zinc-700 focus:border-zinc-600"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                >
                  Set
                </button>
              </form>
              {design.image_url && (
                <form action={devClearImageUrl} className="mt-2">
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                  >
                    Clear image URL
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-12 border-t border-zinc-900 pt-8">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Design details
            </h2>

            {success && (
              <p className="mt-4 text-sm text-green-400">{success}</p>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <DesignEditForm
              designId={design.id}
              initialPrompt={design.prompt}
              initialProductType={design.product_type}
              initialStyle={design.style}
            />
          </div>

          <div className="mt-10 border-t border-zinc-900 pt-6">
            <p className="text-xs text-zinc-600">
              Created {formatDate(design.created_at)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
