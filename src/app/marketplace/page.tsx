import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import PageIntro from "@/components/layout/PageIntro";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Discover and shop original AI-generated apparel from independent creators on Loopawear.",
};

export default function MarketplacePage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Marketplace"
        heading="Explore designs"
        description="Discover original AI-generated apparel from independent creators. Every piece starts with a prompt."
      />
    </PageShell>
  );
}
