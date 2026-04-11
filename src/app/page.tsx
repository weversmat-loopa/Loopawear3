export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black px-6 text-center">
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        AI-powered apparel
      </span>
      <h1 className="text-7xl font-bold tracking-tight text-white sm:text-8xl">
        Loopawear
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        Generate AI clothing designs, place them on products, and sell to the world.
      </p>
      <a
        href="/generate"
        className="mt-10 inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-75"
      >
        Get started
      </a>
    </main>
  );
}
