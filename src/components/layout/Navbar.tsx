"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/actions";
import ThemeToggle from "@/components/ui/ThemeToggle";

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
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-100 bg-white/95 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/95">
      <Link
        href="/"
        className="text-sm font-bold tracking-tight text-zinc-900 transition-colors hover:text-violet-600 dark:text-zinc-100"
      >
        Loopawear
      </Link>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1">
          {links.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === href || pathname.startsWith(href + "/")
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 border-l border-zinc-100 pl-4 dark:border-zinc-800">
          <ThemeToggle />

          {user ? (
            <>
              <Link
                href="/account"
                className={`text-sm font-medium transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
                  pathname === "/account" || pathname.startsWith("/account/")
                    ? "text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                Account
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-400"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:text-white"
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
