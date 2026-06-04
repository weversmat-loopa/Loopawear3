"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type LikeResult =
  | { liked: true;  likeCount: number }
  | { liked: false; likeCount: number }
  | { error: string };

/**
 * Toggle a like for the current user on a design.
 * Returns the new liked state + updated count, or an error string.
 * Designed to be called from a client component via useTransition.
 */
export async function toggleLike(designId: string): Promise<LikeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "not_authenticated" };

  // Check current state
  const { data: existing } = await supabase
    .from("likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("design_id", designId)
    .maybeSingle();

  if (existing) {
    // Already liked → unlike
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("design_id", designId);

    if (error) return { error: error.message };
  } else {
    // Not yet liked → like
    const { error } = await supabase
      .from("likes")
      .insert({ user_id: user.id, design_id: designId });

    if (error) return { error: error.message };
  }

  // Fetch fresh count
  const { count } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("design_id", designId);

  const newLiked = !existing;

  // Revalidate all pages that display like state or counts, so any
  // subsequent server render (navigation, refresh) reflects the new value.
  revalidatePath("/marketplace", "page");
  revalidatePath(`/marketplace/${designId}`, "page");
  revalidatePath("/", "page");
  // Creator profile pages aren't known here, but the trending/marketplace
  // pages are the primary surfaces. Creator profiles revalidate on next visit.

  return { liked: newLiked, likeCount: count ?? 0 };
}
