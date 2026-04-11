import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import PageIntro from "@/components/layout/PageIntro";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Design unique apparel with AI. Describe your vision and let AI bring it to life.",
};

export default function GeneratePage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Design studio"
        heading="Create your design"
        description="Turn a prompt into a wearable design. Describe your vision and let AI bring it to life."
      />
    </PageShell>
  );
}
