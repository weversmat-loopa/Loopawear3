import Link from "next/link";

export default function GeneratePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black px-6 text-center">
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Design studio
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Create your design
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        The AI design studio is being built. This is where you will generate and customize your clothing designs.
      </p>
      <Link
        href="/"
        className="mt-10 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
      >
        ← Back to home
      </Link>
    </main>
  );
}
