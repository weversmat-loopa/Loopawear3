import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

// /account/creator was the old Creator Dashboard page.
// It is now superseded by the tabbed creator profile (/creators/[id]).
// Redirect to the owner's profile so old links (e.g. from Stripe sale emails) still work.
export default async function CreatorDashboardRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  redirect(`/creators/${user.id}?tab=designs`);
}
