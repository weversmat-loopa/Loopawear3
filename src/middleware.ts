import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Supabase session middleware.
 *
 * Refreshes the auth token on every request so that:
 * 1. Session cookies are written to the response BEFORE headers are locked —
 *    avoiding the "TypeError: Cannot create property 'set-cookie' on string"
 *    that occurs when Server Components try to write cookies after streaming starts.
 * 2. Short-lived access tokens are silently renewed, keeping users logged in.
 *
 * This middleware does NOT protect routes — auth checks in page.tsx remain the
 * authority for what a user may access.
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Step 1: set on the request so downstream Server Components see them.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Step 2: recreate the response so it carries the updated cookies.
          supabaseResponse = NextResponse.next({ request });
          // Step 3: write the cookies to the response headers (headers are open here).
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add logic between createServerClient() and auth.getUser().
  // A mistake here could cause sessions to stop refreshing correctly.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - api routes (they handle auth themselves)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/).*)",
  ],
};
