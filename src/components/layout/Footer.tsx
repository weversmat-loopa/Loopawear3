import Link from "next/link";
import { DoodleSquiggle, DoodleHeart } from "@/components/ui/Doodles";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/imprint", label: "Imprint" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t-2 border-ink bg-paper px-6 py-5">
      <DoodleSquiggle
        aria-hidden
        className="pointer-events-none absolute -top-1 left-1/2 hidden h-3 w-16 -translate-x-1/2 text-brand-orange/60 md:block"
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <DoodleHeart className="h-3.5 w-3.5 -rotate-6 text-brand-green" />
          <span className="font-marker text-sm text-ink">Loopawear</span>
          {" "}&mdash; AI-powered apparel marketplace · © {new Date().getFullYear()}
        </p>
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500"
        >
          {LEGAL_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
