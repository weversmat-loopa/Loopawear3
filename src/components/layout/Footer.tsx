import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/imprint", label: "Imprint" },
];

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink bg-paper px-6 py-5">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
        <p className="text-xs text-zinc-500">
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
