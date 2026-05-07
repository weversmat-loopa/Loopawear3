import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refunds", label: "Refunds" },
  { href: "/imprint", label: "Imprint" },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center md:flex-row md:justify-between md:text-left">
        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          © {new Date().getFullYear()} Loopawear &mdash; AI-powered apparel marketplace
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
