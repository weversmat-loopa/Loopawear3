import Button from "@/components/ui/Button";
import PageShell from "@/components/layout/PageShell";

export default function Home() {
  return (
    <PageShell>
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        AI-powered apparel
      </span>
      <h1 className="text-7xl font-bold tracking-tight text-white sm:text-8xl">
        Loopawear
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        Generate AI clothing designs, place them on products, and sell to the world.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button href="/generate" variant="primary">Get started</Button>
        <Button href="/marketplace" variant="ghost">Browse marketplace</Button>
      </div>
    </PageShell>
  );
}
