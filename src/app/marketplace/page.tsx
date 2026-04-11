import PageShell from "@/components/layout/PageShell";

export default function MarketplacePage() {
  return (
    <PageShell>
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Marketplace
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Browse designs
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        The marketplace is being built. This is where you will discover and purchase AI-generated apparel from creators.
      </p>
    </PageShell>
  );
}
