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

  const { data } = await supabase
    .from("designs")
    .select("id, prompt, product_type, style, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(100);

  const designs: MarketplaceDesign[] = data ?? [];

  return <MarketplaceBrowse designs={designs} />;
}
