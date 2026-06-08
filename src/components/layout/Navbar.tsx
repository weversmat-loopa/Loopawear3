"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { signOut } from "@/lib/auth/actions";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { DoodleStar, DoodleSparkle, DoodleUnderline } from "@/components/ui/Doodles";

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
                  href={`/creators/${user.id}`}
                  className={`text-sm font-medium transition-colors ${
                    pathname === `/creators/${user.id}`
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  My profile
                </Link>
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

      {/* ── Mobile full-screen menu ──────────────────────────────────
           Full-screen cream overlay with doodle-style nav items.
           Only rendered on < md. Desktop nav is unaffected.
      ─────────────────────────────────────────────────────────── */}
      {isMenuOpen && (
        <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col overflow-y-auto bg-paper px-6 pb-10 pt-8 md:hidden">

          {/* Decorative sparkles – top corners */}
          <DoodleSparkle className="absolute right-6 top-5 h-5 w-5 text-brand-orange opacity-60 doodle-twinkle" />
          <DoodleSparkle className="absolute left-8 top-8 h-3.5 w-3.5 text-brand-blue opacity-40 doodle-twinkle" />

          {/* ── Primary nav links ── */}
          <nav className="flex flex-col">
            {links.map(({ label, href }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group relative flex min-h-[56px] items-center border-b-2 border-ink/10 py-3 transition-colors active:bg-paper-2 dark:border-ink/20 ${
                    isActive ? "text-ink" : "text-ink/70 hover:text-ink"
                  }`}
                >
                  <span className={`font-display text-2xl leading-none tracking-tight ${isActive ? "" : ""}`}>
                    {label}
                  </span>
                  {isActive && (
                    <DoodleUnderline className="absolute bottom-1.5 left-0 h-2 w-24 text-brand-orange" />
                  )}
                  {/* Subtle right arrow on hover */}
                  <span className="ml-auto text-brand-orange opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100">
                    →
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ── Account actions ── */}
          <div className="mt-6 flex flex-col gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`group relative flex min-h-[56px] items-center border-b-2 border-ink/10 py-3 font-display text-2xl leading-none tracking-tight transition-colors active:bg-paper-2 dark:border-ink/20 ${
                      pathname.startsWith("/admin") ? "text-ink" : "text-ink/70 hover:text-ink"
                    }`}
                  >
                    Admin
                    <span className="ml-auto text-brand-orange opacity-0 transition-opacity group-hover:opacity-100">→</span>
                  </Link>
                )}
                <Link
                  href={`/creators/${user.id}`}
                  className={`group relative flex min-h-[56px] items-center border-b-2 border-ink/10 py-3 font-display text-2xl leading-none tracking-tight transition-colors active:bg-paper-2 dark:border-ink/20 ${
                    pathname === `/creators/${user.id}`
                      ? "text-ink"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  My profile
                  <span className="ml-auto text-brand-orange opacity-0 transition-opacity group-hover:opacity-100">→</span>
                </Link>
                <Link
                  href="/account"
                  className={`group relative flex min-h-[56px] items-center border-b-2 border-ink/10 py-3 font-display text-2xl leading-none tracking-tight transition-colors active:bg-paper-2 dark:border-ink/20 ${
                    pathname === "/account" || pathname.startsWith("/account/")
                      ? "text-ink"
                      : "text-ink/70 hover:text-ink"
                  }`}
                >
                  Account
                  <span className="ml-auto text-brand-orange opacity-0 transition-opacity group-hover:opacity-100">→</span>
                </Link>
                <form action={signOut} className="w-full">
                  <button
                    type="submit"
                    className="flex min-h-[56px] w-full items-center border-b-2 border-ink/10 py-3 font-display text-2xl leading-none tracking-tight text-ink/70 transition-colors hover:text-ink active:bg-paper-2 dark:border-ink/20"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex min-h-[56px] items-center border-b-2 border-ink/10 py-3 font-display text-2xl leading-none tracking-tight text-ink/70 transition-colors hover:text-ink dark:border-ink/20"
                >
                  Log in
                </Link>
                <div className="pt-2">
                  <Link
                    href="/signup"
                    className="sticker block rounded-full bg-brand-blue px-6 py-3.5 text-center font-display text-xl font-extrabold text-white"
                  >
                    Sign up ✦
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* ── Dark mode row ── */}
          <div className="mt-6 flex min-h-[52px] items-center justify-between border-t-2 border-ink/10 pt-5 dark:border-ink/20">
            <span className="font-hand text-lg text-ink/60">Dark mode</span>
            <ThemeToggle />
          </div>

          {/* ── Bottom doodle accent ── */}
          <div className="mt-auto flex items-center justify-center gap-3 pt-8 text-ink/20">
            <DoodleStar className="h-4 w-4" />
            <DoodleSparkle className="h-3 w-3" />
            <DoodleStar className="h-4 w-4" />
          </div>
        </div>
      )}
    </>
  );
}
