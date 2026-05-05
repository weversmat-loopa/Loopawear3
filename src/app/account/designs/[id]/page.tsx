import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DesignEditForm from "./DesignEditForm";
import DesignImageSection from "./DesignImageSection";
import ConfirmForm from "@/components/ui/ConfirmForm";
import {
  publishDraft,
  unpublishDesign,
  deleteDesign,
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
    .select("title, product_type")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!design) return { title: "Design" };

  return {
    title: design.title ?? (design.product_type ? `${design.product_type} Design` : "Design"),
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
    .select("id, title, prompt, product_type, style, status, image_status, image_url, created_at")
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
    <main className="flex flex-1 flex-col px-6 py-14 md:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/account"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Your account
        </Link>

        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs ${
                isPublished
                  ? "border-violet-300 bg-violet-50 text-violet-600"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
              }`}
            >
              {isPublished ? "Published" : "Draft"}
            </span>
            {!isPublished && design.image_status === "ready" && (
              <form action={publishDraft}>
                <input type="hidden" name="designId" value={design.id} />
                <button
                  type="submit"
                  className="rounded-full bg-zinc-900 px-4 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                  Publish →
                </button>
              </form>
            )}
            {isPublished && (
              <>
                <Link
                  href={`/marketplace/${design.id}`}
                  className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  View on marketplace ↗
                </Link>
                <form action={unpublishDesign}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-200 px-4 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-100"
                  >
                    Unpublish
                  </button>
                </form>
              </>
            )}
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {design.title ?? (design.product_type ? `${design.product_type} Design` : "Design")}
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

          {process.env.NODE_ENV === "development" && design.image_status === "generating" && (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-400">
                Dev — simulate generation result
              </p>
              <div className="mt-2.5 flex gap-2">
                <form action={devMarkGenerationReady}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  >
                    Mark ready
                  </button>
                </form>
                <form action={devMarkGenerationFailed}>
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  >
                    Mark failed
                  </button>
                </form>
              </div>
            </div>
          )}

          {process.env.NODE_ENV === "development" && design.image_status !== "generating" && (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
              <p className="text-xs text-zinc-400">Dev — test image URL</p>
              <form action={devSetTestImageUrl} className="mt-2.5 flex gap-2">
                <input type="hidden" name="designId" value={design.id} />
                <input
                  name="image_url"
                  type="url"
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900"
                >
                  Set
                </button>
              </form>
              {design.image_url && (
                <form action={devClearImageUrl} className="mt-2">
                  <input type="hidden" name="designId" value={design.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                  >
                    Clear image URL
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Design details
              </h2>
            </div>

            {success && (
              <p className="mt-4 text-sm text-green-600">{success}</p>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <DesignEditForm
              designId={design.id}
              initialTitle={design.title ?? null}
              initialPrompt={design.prompt}
              initialProductType={design.product_type}
              initialStyle={design.style}
            />
          </div>

          <div className="mt-10 border-t border-zinc-200 pt-6 flex items-center justify-between dark:border-zinc-800">
            <p className="text-xs text-zinc-400">
              Created {formatDate(design.created_at)}
            </p>
            <ConfirmForm
              action={deleteDesign}
              message="Delete this design permanently? This cannot be undone."
              hiddenFields={{ designId: design.id }}
            >
              <button
                type="submit"
                className="text-xs text-zinc-400 transition-colors hover:text-red-500"
              >
                Delete design
              </button>
            </ConfirmForm>
          </div>
        </div>
      </div>
    </main>
  );
}
