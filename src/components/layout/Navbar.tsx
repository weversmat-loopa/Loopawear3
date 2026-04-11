"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Generate", href: "/generate" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-zinc-800 bg-black px-6">
      <Link
        href="/"
        className="text-sm font-bold tracking-tight text-white hover:opacity-80 transition-opacity"
      >
        Loopawear
      </Link>
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
    </header>
  );
}
