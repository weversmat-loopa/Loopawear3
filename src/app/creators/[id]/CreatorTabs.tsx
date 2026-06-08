"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type TabId = "designs" | "drafts" | "sales" | "credits" | "settings";

interface Tab {
  id: TabId;
  label: string;
}

interface CreatorTabsProps {
  /** Which tabs to render — owner gets all 5, public gets only "designs" */
  tabs: Tab[];
  activeTab: TabId;
  profileId: string;
}

export default function CreatorTabs({ tabs, activeTab, profileId }: CreatorTabsProps) {
  const pathname = usePathname();
  // Suppress unused-var — useSearchParams is needed to keep the component
  // reactive to URL changes without a full navigation.
  useSearchParams();

  return (
    <div className="border-b-2 border-ink/10 dark:border-ink/20">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(({ id, label }) => {
          const isActive = activeTab === id;
          const href = `${pathname}?tab=${id}`;
          return (
            <Link
              key={id}
              href={href}
              replace
              className={`shrink-0 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-ink bg-paper text-ink dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-paper-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
