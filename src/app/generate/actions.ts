"use server";

import { createClient } from "@/utils/supabase/server";

// ── savePlacement ─────────────────────────────────────────────────────
// Requires the migration in supabase/migrations/0001_design_placement.sql
// (adds a JSONB `placement` column to `designs`) before use.
//
// The stored JSON is self-describing: x/y/scale/rotation are in the editor's
// canvas space (canvasW × canvasH), so any consumer can re-map the placement
// onto a differently-sized surface — including a future Printful print file.
// Keep x/y/scale stable: components/ui/ProductMockup.tsx reads them.
export interface PlacementData {
  side:        "front" | "back";
  x:           number; // design centre X, in canvas px
  y:           number; // design centre Y, in canvas px
  scale:       number; // Fabric scaleX (fraction of the design's natural size)
  rotation:    number; // degrees, clockwise
  shirtColor:  string;
  size:        string;
  canvasW:     number; // reference canvas width  the coords were authored in
  canvasH:     number; // reference canvas height the coords were authored in
}

type SavePlacementResult =
  | { success: true; error?: never }
  | { error: "auth_required" | "save_failed"; success?: never };

export async function savePlacement(
  designId: string,
  placement: PlacementData,
): Promise<SavePlacementResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "auth_required" };

  const { error } = await supabase
    .from("designs")
    .update({ placement })
    .eq("id", designId)
    .eq("creator_id", user.id);

  if (error) return { error: "save_failed" };

  return { success: true };
}

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
    const { data: existing } = await supabase
      .from("designs")
      .select("status")
      .eq("id", input.designId)
      .eq("creator_id", user.id)
      .maybeSingle();

    if (existing?.status === "draft") {
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
    // Design is published or not found — fall through to create a new draft
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
