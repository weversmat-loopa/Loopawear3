import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover and shop original AI-generated apparel from independent creators on Loopawear.",
};

export default function MarketplacePage() {
  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Marketplace
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Explore designs
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Discover original AI-generated apparel from independent creators.
          Every piece starts with a prompt.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center border-t border-zinc-900 py-24 text-center">
          <p className="text-sm font-medium text-zinc-500">
            No designs published yet
          </p>
          <p className="mt-2 text-sm text-zinc-700">
            Creators are just getting started — check back soon.
          </p>
        </div>
      </div>
    </main>
  );
}
