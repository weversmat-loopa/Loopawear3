"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  const current = document.documentElement.getAttribute("data-theme");
  return current === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    localStorage.setItem("loopawear-theme", theme);
  } catch {}
}

// Tiny in-module pub/sub so useSyncExternalStore can re-render when
// applyTheme mutates the DOM. The data-theme attribute itself doesn't
// fire change events, so we notify subscribers explicitly from toggle().
const themeListeners = new Set<() => void>();
function subscribeToTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}
function notifyThemeChange() {
  for (const listener of themeListeners) listener();
}

export default function ThemeToggle() {
  // The third argument (server snapshot) is what's returned during SSR
  // *and* during the first client render of the hydrated tree. Returning
  // null here means the server and client first render both produce the
  // placeholder branch below — no hydration mismatch. After hydration,
  // useSyncExternalStore switches to the client snapshot (readTheme),
  // which runs synchronously during render. No setState-in-effect.
  const theme = useSyncExternalStore<Theme | null>(
    subscribeToTheme,
    readTheme,
    () => null,
  );

  function toggle() {
    if (theme === null) return;
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    notifyThemeChange();
  }

  // Render a same-size placeholder during SSR/hydration to avoid layout
  // shift and to keep the server output identical to the client's first
  // render (preventing hydration mismatch warnings).
  if (theme === null) {
    return (
      <div
        className="h-8 w-8 rounded-full border border-zinc-700"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition-all duration-300 hover:border-zinc-500 hover:text-zinc-100"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
