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
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/80 px-4 py-1.5 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          AI-powered apparel
        </span>
      </div>

      <h1 className="bg-gradient-to-b from-white via-white to-violet-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
        Wear what<br className="hidden sm:block" /> you imagine.
      </h1>

      <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-500">
        Describe your vision and let AI bring it to life on real apparel.
        Keep it for yourself — or publish it to the world.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Button href="/generate" variant="primary">
          Start designing →
        </Button>
        <Button href="/marketplace" variant="ghost">
          Browse marketplace
        </Button>
      </div>
    </PageShell>
  );
}
