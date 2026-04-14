import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DesignEditForm from "./DesignEditForm";

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
    .select("id, prompt, product_type, style, status, created_at")
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

          <p className="mt-10 border-t border-zinc-900 pt-6 text-xs text-zinc-600">
            Created {formatDate(design.created_at)}
          </p>
        </div>
      </div>
    </main>
  );
}
