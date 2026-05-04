"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/actions";

const links = [
  { label: "Marketplace", href: "/marketplace" },
  { label: "Studio", href: "/generate" },
];

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-800/60 bg-black/95 px-6 backdrop-blur-sm">
      <Link
        href="/"
        className="text-sm font-bold tracking-tight text-white transition-colors hover:text-violet-200"
      >
        Loopawear
      </Link>

      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-1">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === href || pathname.startsWith(href + "/")
                  ? "border-zinc-700 bg-zinc-900/80 text-white"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-l border-zinc-800/60 pl-6">
          {user ? (
            <>
              <Link
                href="/account"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  pathname === "/account" || pathname.startsWith("/account/") ? "text-white" : "text-zinc-400"
                }`}
              >
                Account
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-300"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-300"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}