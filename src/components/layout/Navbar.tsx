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
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-white/[0.06] bg-zinc-950/95 px-6 backdrop-blur-md">
      <Link
        href="/"
        className="text-base font-bold tracking-tight text-white transition-all duration-300 hover:text-violet-400"
      >
        Loopawear
      </Link>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-6">
          {links.map(({ label, href }) => {
            const isActive =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`border-b-2 pb-0.5 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "border-violet-500 text-white"
                    : "border-transparent text-zinc-400 hover:border-violet-500/40 hover:text-zinc-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-l border-white/[0.06] pl-4">
          <ThemeToggle />

          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin/review"
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith("/admin")
                      ? "text-white"
                      : "text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/account" || pathname.startsWith("/account/")
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                Account
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-400"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-300 transition-all duration-300 hover:border-violet-500/50 hover:text-white hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]"
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
