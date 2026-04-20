import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import MarketplaceBrowse from "./MarketplaceBrowse";
import type { MarketplaceDesign } from "./MarketplaceBrowse";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover and shop original AI-generated apparel from independent creators on Loopawear.",
};

export default async function MarketplacePage() {
  const supabase = await createClient();

  const { data: designsRaw } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, image_url, created_at, creator_id")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  const designsData = designsRaw ?? [];

  const creatorIds = [
    ...new Set(
      designsData
        .map((d) => d.creator_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let creatorNames: Record<string, string | null> = {};
  if (creatorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", creatorIds);
    creatorNames = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? null])
    );
  }

  const designs: MarketplaceDesign[] = designsData.map((d) => ({
    ...d,
    creator_name: creatorNames[d.creator_id] ?? null,
  }));

  return <MarketplaceBrowse designs={designs} />;
}
