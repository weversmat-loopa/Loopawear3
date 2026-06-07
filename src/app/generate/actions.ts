"use server";

import { createClient } from "@/utils/supabase/server";
import { MIN_PRICE_CENTS } from "@/lib/pricing";

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

// ── saveDetails ───────────────────────────────────────────────────────────────
// Like updateDesign in account/actions.ts, but returns a result instead of
// redirecting — so the Studio can call it without a page reload.

type SaveDetailsInput = {
  designId: string;
  title: string;
  prompt: string;
  productType: string | null;
  style: string | null;
  priceEuros: string;
};

type SaveDetailsResult =
  | { success: true; error?: never }
  | { error: string; success?: never };

export async function saveDetails(
  input: SaveDetailsInput
): Promise<SaveDetailsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "auth_required" };

  const title = input.title.trim() || null;
  const prompt = input.prompt.trim();
  if (!prompt) return { error: "Prompt cannot be empty." };

  let priceCents: number | null = null;
  if (input.priceEuros.trim() !== "") {
    const parsed = parseFloat(input.priceEuros);
    const minEuros = (MIN_PRICE_CENTS / 100).toFixed(2);
    if (isNaN(parsed) || Math.round(parsed * 100) < MIN_PRICE_CENTS) {
      return { error: `Price must be at least €${minEuros} to cover production costs.` };
    }
    priceCents = Math.round(parsed * 100);
  }

  const { error } = await supabase
    .from("designs")
    .update({
      title,
      prompt,
      product_type: input.productType,
      style: input.style,
      price_cents: priceCents,
    })
    .eq("id", input.designId)
    .eq("creator_id", user.id);

  if (error) return { error: "Could not save changes. Please try again." };

  return { success: true };
}

// ── submitDesignForReview ─────────────────────────────────────────────────────
// Like submitForReview in account/actions.ts, but returns a result instead of
// redirecting — so the Studio can show an in-place confirmation.

type SubmitResult =
  | { success: true; error?: never }
  | { error: string; success?: never };

export async function submitDesignForReview(
  designId: string
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "auth_required" };

  const { data, error } = await supabase
    .from("designs")
    .update({ status: "pending_review" })
    .eq("id", designId)
    .eq("creator_id", user.id)
    .eq("status", "draft")
    .select("id");

  if (error || !data || data.length === 0) {
    return { error: "Could not submit for review. Please try again." };
  }

  return { success: true };
}
