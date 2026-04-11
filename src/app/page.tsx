import type { Metadata } from "next";
import Button from "@/components/ui/Button";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: { absolute: "Loopawear" },
  description:
    "Describe your design and let AI bring it to life. Create and sell original AI-generated apparel on Loopawear.",
};

export default function Home() {
  return (
    <PageShell>
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        AI-powered apparel
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Wear what you imagine.
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        Describe your design and let AI bring it to life. Place it on real
        apparel — keep it for yourself or sell it to the world.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button href="/generate" variant="primary">
          Start designing
        </Button>
        <Button href="/marketplace" variant="ghost">
          Browse marketplace
        </Button>
      </div>
    </PageShell>
  );
}
