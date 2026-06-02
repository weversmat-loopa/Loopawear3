"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/actions";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { DoodleStar } from "@/components/ui/Doodles";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b-2 border-ink bg-paper px-6">
        <Link
          href="/"
          className="group flex items-center gap-1.5 text-ink transition-transform hover:-translate-y-0.5"
        >
          <DoodleStar className="h-4 w-4 text-brand-orange transition-transform group-hover:rotate-12" />
          <span className="font-marker text-xl leading-none">Loopawear</span>
        </Link>

        {/* ── Desktop nav (md+) ─────────────────────────────────── */}
        <div className="hidden items-center gap-6 md:flex">
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
                    href="/admin"
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
                  className="sticker-sm rounded-full bg-brand-blue px-4 py-1.5 text-sm font-extrabold text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Mobile controls (< md) ────────────────────────────── */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Mobile slide-down menu ────────────────────────────────── */}
      {isMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto bg-paper px-6 py-8 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map(({ label, href }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 flex flex-col gap-1 border-t border-zinc-100 pt-6 dark:border-zinc-800">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                        : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  href="/account"
                  className={`rounded-lg px-3 py-3 text-base font-medium transition-colors ${
                    pathname === "/account" || pathname.startsWith("/account/")
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                  }`}
                >
                  Account
                </Link>
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="w-full rounded-lg px-3 py-3 text-left text-base font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-3 text-base font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="sticker-sm mt-2 rounded-full bg-brand-blue px-4 py-2.5 text-center text-base font-extrabold text-white"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
