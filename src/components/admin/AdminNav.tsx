"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Overview", href: "/admin" },
  { label: "Review queue", href: "/admin/review" },
  { label: "Designs", href: "/admin/designs" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Users", href: "/admin/users" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 overflow-x-auto px-6 py-1">
        <span className="mr-3 shrink-0 text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Admin
        </span>
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
