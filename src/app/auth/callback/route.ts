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

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("The link is invalid or has expired.")}`, origin)
  );
}
