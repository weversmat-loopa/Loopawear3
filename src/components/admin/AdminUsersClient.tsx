"use client";

import { useState } from "react";
import { updateUserCredits } from "@/app/admin/actions";

type User = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  generation_credits: number;
  created_at: string;
};

type Props = {
  users: User[];
  error?: string;
  success?: string;
};

const ROLE_CLASSES: Record<string, string> = {
  admin: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300",
  creator: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  buyer: "border-zinc-200 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

function CreditsForm({
  user,
  onDone,
}: {
  user: User;
  onDone: () => void;
}) {
  const [value, setValue] = useState(String(user.generation_credits));

  return (
    <form
      action={updateUserCredits}
      className="flex items-center gap-2"
      onSubmit={onDone}
    >
      <input type="hidden" name="userId" value={user.id} />
      <input
        type="number"
        name="credits"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        min={0}
        className="w-20 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-sm tabular-nums text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-zinc-500"
        autoFocus
      />
      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Cancel
      </button>
    </form>
  );
}

export default function AdminUsersClient({ users, error, success }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.display_name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <main className="flex flex-1 flex-col px-6 py-12 md:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Users
          </h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            {users.length} accounts
          </span>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
            {success}
          </p>
        )}

        {/* Search */}
        <div className="mt-6">
          <input
            type="search"
            placeholder="Search by name, email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-zinc-500"
          />
        </div>

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Credits
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-400 dark:text-zinc-500">
                    No users found.
                  </td>
                </tr>
              )}
              {filtered.map((user) => {
                const joinedDate = new Date(user.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });
                const roleClass = ROLE_CLASSES[user.role] ?? ROLE_CLASSES.buyer;
                const isEditing = editingId === user.id;

                return (
                  <tr key={user.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {user.display_name ?? (
                          <span className="italic text-zinc-400">No name</span>
                        )}
                      </p>
                      {user.email && (
                        <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                          {user.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${roleClass}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <CreditsForm
                          user={user}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingId(user.id)}
                          className="group flex items-center gap-1.5 tabular-nums"
                          title="Click to edit credits"
                        >
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {user.generation_credits}
                          </span>
                          <svg
                            className="h-3 w-3 text-zinc-300 transition-colors group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500">
                      {joinedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
