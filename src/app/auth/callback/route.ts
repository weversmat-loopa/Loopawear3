import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Only allow relative paths that start with a single slash.
// Blocks protocol-relative (//evil.com) and absolute (https://evil.com) URLs.
function isSafeRedirect(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "";
  const next = isSafeRedirect(rawNext) ? rawNext : "/account";

  // Supabase can return an error directly on the callback URL (e.g. when the
  // user denies the OAuth consent screen).  Capture and surface it before
  // attempting any code exchange so the user sees a meaningful message.
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");
  if (oauthError && !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, origin)
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
    // Surface the actual Supabase error rather than a generic message.
    // The most common cause is a PKCE code-verifier cookie mismatch, which
    // happens when the redirectTo origin in the OAuth request does not match
    // the origin the browser lands on for the callback.  Fix: ensure
    // NEXT_PUBLIC_SITE_URL is set correctly in every deployment environment.
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message ?? "The link is invalid or has expired.")}`,
        origin
      )
    );
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("The link is invalid or has expired.")}`, origin)
  );
}
