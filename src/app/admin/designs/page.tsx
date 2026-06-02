import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";
import AdminDesignsClient from "@/components/admin/AdminDesignsClient";

export const metadata: Metadata = {
  title: "Admin — Designs",
};

type AdminDesignsPageProps = {
  searchParams?: Promise<{ filter?: string; error?: string; success?: string }>;
};

export default async function AdminDesignsPage({
  searchParams,
}: AdminDesignsPageProps) {
  const service = createServiceClient();
  const params = await searchParams;
  const filter = params?.filter ?? "all";

  // Fetch all designs (no status filter — client handles it)
  const { data: designsRaw } = await service
    .from("designs")
    .select(
      "id, title, prompt, product_type, image_url, status, price_cents, archived_at, creator_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const designs = designsRaw ?? [];

  // Fetch creator display names
  const creatorIds = [
    ...new Set(designs.map((d) => d.creator_id).filter(Boolean)),
  ] as string[];

  let creatorNames: Record<string, string> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, display_name, email")
      .in("id", creatorIds);
    creatorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? p.email ?? p.id.slice(0, 8)])
    );
  }

  return (
    <AdminDesignsClient
      designs={designs}
      creatorNames={creatorNames}
      initialFilter={filter}
      error={params?.error}
      success={params?.success}
    />
  );
}
