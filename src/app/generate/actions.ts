"use server";

import { createClient } from "@/utils/supabase/server";

type SaveDraftInput = {
  prompt: string;
  productType: string | null;
  styleMood: string | null;
  designId?: string | null;
};

type SaveDraftResult =
  | { id: string; error?: never }
  | { error: "auth_required" | "save_failed"; id?: never };

export async function saveDraft(
  input: SaveDraftInput
): Promise<SaveDraftResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "auth_required" };
  }

  if (input.designId) {
    const { data, error } = await supabase
      .from("designs")
      .update({
        prompt: input.prompt.trim(),
        product_type: input.productType,
        style: input.styleMood,
      })
      .eq("id", input.designId)
      .eq("creator_id", user.id)
      .select("id")
      .single();

    if (error || !data) {
      return { error: "save_failed" };
    }

    return { id: data.id };
  }

  const { data, error } = await supabase
    .from("designs")
    .insert({
      creator_id: user.id,
      prompt: input.prompt.trim(),
      product_type: input.productType,
      style: input.styleMood,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "save_failed" };
  }

  return { id: data.id };
}
