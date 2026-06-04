"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function followCreator(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const following_id = String(formData.get("following_id") ?? "").trim();
  if (!following_id) return;

  if (following_id === user.id) return; // no self-follow

  await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id });
  // silently ignore duplicate-key errors (user already follows)

  redirect(`/creators/${following_id}`);
}

export async function unfollowCreator(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const following_id = String(formData.get("following_id") ?? "").trim();
  if (!following_id) return;

  await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", following_id);

  redirect(`/creators/${following_id}`);
}
