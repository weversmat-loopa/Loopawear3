import { createServiceClient } from "@/utils/supabase/service";

/**
 * Resend transactional email helper. Direct fetch — no SDK dependency.
 *
 * Required env:
 *   RESEND_API_KEY  — from https://resend.com/api-keys
 * Optional env:
 *   EMAIL_FROM      — sender address. RESEND_FROM is accepted as an alias
 *                     (whichever is set wins). Defaults to
 *                     noreply@loopawear.com. Use onboarding@resend.dev
 *                     while testing before the loopawear.com domain is
 *                     verified in Resend.
 *
 * IMPORTANT: all functions in this module fail silently (log + return)
 * on missing config or upstream errors. Email is a side-effect of
 * approving a design / processing a sale; we don't want a Resend outage
 * or a missing API key to roll back an order or block an admin action.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping send to",
      to,
      `(subject: "${subject}")`
    );
    return;
  }

  // Accept either EMAIL_FROM (used historically by this module) or
  // RESEND_FROM (the name configured in Vercel). Supporting both avoids
  // silent send failures when only one of the two is set.
  const from =
    process.env.EMAIL_FROM ?? process.env.RESEND_FROM ?? "noreply@loopawear.com";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[email] Resend rejected request:", {
        status: res.status,
        to,
        subject,
        body,
      });
    }
  } catch (err) {
    console.error("[email] Send failed:", {
      to,
      subject,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Looks up a user's email address via the service-role admin API.
 * Returns null when the user has no email on file or the lookup fails;
 * callers should treat that as "skip the notification".
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn(
        "[email] auth.admin.getUserById failed:",
        userId,
        error.message
      );
      return null;
    }
    return data?.user?.email ?? null;
  } catch (err) {
    console.warn(
      "[email] auth.admin.getUserById threw:",
      userId,
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

/**
 * Absolute site URL for use in email links. Mirrors the metadataBase
 * fallback in layout.tsx so OG previews and email links agree.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://project-8lsdx.vercel.app"
  );
}
