import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your designs, orders, and creator profile.",
  robots: { index: false },
};

export default async function AccountPage() {
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

  return (
    <PageShell>
      <div className="w-full max-w-md text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Your account
        </h1>
        <div className="mt-8 divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Name
            </p>
            <p className={`mt-1 text-sm ${profile?.display_name ? "text-white" : "text-zinc-500"}`}>
              {profile?.display_name ?? "—"}
            </p>
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
