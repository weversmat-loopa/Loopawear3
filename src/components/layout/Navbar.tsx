"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Generate", href: "/generate" },
  { label: "Account", href: "/account" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-zinc-800 bg-black px-6">
      <Link
        href="/"
        className="text-sm font-bold tracking-tight text-white transition-opacity hover:opacity-80"
      >
        Loopawear
      </Link>
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-6">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors hover:text-white ${
                pathname === href ? "text-white" : "text-zinc-400"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-l border-zinc-800 pl-6">
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
