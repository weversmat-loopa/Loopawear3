import type { Metadata } from "next";
import { createServiceClient } from "@/utils/supabase/service";
import AdminUsersClient from "@/components/admin/AdminUsersClient";

export const metadata: Metadata = {
  title: "Admin — Users",
};

type AdminUsersPageProps = {
  searchParams?: Promise<{ error?: string; success?: string }>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const service = createServiceClient();

  const { data: usersRaw } = await service
    .from("profiles")
    .select("id, display_name, email, role, generation_credits, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const users = usersRaw ?? [];

  const params = await searchParams;

  return (
    <AdminUsersClient
      users={users}
      error={params?.error}
      success={params?.success}
    />
  );
}
