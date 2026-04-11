import Link from "next/link";
import PageShell from "@/components/layout/PageShell";
import PageIntro from "@/components/layout/PageIntro";

export default function GeneratePage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Design studio"
        heading="Create your design"
        description="Turn a prompt into a wearable design. Describe your vision and let AI bring it to life."
      />
      <Link
        href="/"
        className="mt-10 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
      >
        ← Back to home
      </Link>
    </PageShell>
  );
}
