import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import Input from "@/components/ui/Input";
import { createClient } from "@/utils/supabase/server";
import { updateDisplayName } from "./actions";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your designs, orders, and creator profile.",
  robots: { index: false },
};

type AccountPageProps = {
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const params = await searchParams;
  const success = params?.success;
  const error = params?.error;

  return (
    <PageShell>
      <div className="w-full max-w-md text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Your account
        </h1>

        {success && (
          <p className="mt-4 text-sm text-green-400">{success}</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-8 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="px-6 py-4">
            <form action={updateDisplayName}>
              <label
                htmlFor="display_name"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Name
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Input
                  id="display_name"
                  name="display_name"
                  type="text"
                  defaultValue={profile?.display_name ?? ""}
                  placeholder="Your display name"
                  autoComplete="name"
                />
                <button
                  type="submit"
                  className="shrink-0 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Email
            </p>
            <p className="mt-1 text-sm text-white">{user.email}</p>
          </div>

          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Role
            </p>
            <p className="mt-1 text-sm capitalize text-white">
              {profile?.role ?? "buyer"}
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
