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
  isAdmin?: boolean;
}

export default function Navbar({ user, isAdmin = false }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-zinc-100 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="text-base font-bold tracking-tight text-zinc-900 transition-colors hover:text-zinc-600 dark:text-white dark:hover:text-zinc-300"
      >
        Loopawear
      </Link>

      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-6">
          {links.map(({ label, href }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 border-l border-zinc-100 pl-6 dark:border-zinc-800">
          <ThemeToggle />

          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin/review"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
                  }`}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/account" || pathname.startsWith("/account/")
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
                className="rounded-full border border-zinc-900 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-zinc-400 dark:hover:text-white"
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
