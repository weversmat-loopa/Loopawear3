import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// /account now redirects to the owner's tabbed creator profile.
// All profile settings, drafts, sales, and credits live there.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(`/creators/${user.id}?tab=settings`);
}
