"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // session is null when Supabase requires email confirmation
  if (!data.session) {
    redirect("/signup?message=check_email");
  }

  redirect("/account");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://loopawear.vercel.app";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/forgot-password?sent=1");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  // NEXT_PUBLIC_SITE_URL must be set to the canonical origin of the
  // environment (e.g. https://loopawear.vercel.app for production,
  // http://localhost:3000 for local dev).  The hardcoded fallback is a
  // last-resort guard; in practice the env var should always be present.
  // A wrong/missing value here is the primary cause of intermittent
  // "invalid link" errors after Google OAuth because the redirectTo in the
  // OAuth request must exactly match the URI registered in Supabase and
  // Google Console.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://loopawear.vercel.app";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
      queryParams: {
        // Request a refresh token so the session survives beyond the
        // default one-hour access-token lifetime without requiring a
        // re-login.
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Could not start Google sign-in.")}`
    );
  }

  redirect(data.url);
}

export async function signInWithApple() {
  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://loopawear.vercel.app";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: { redirectTo: `${siteUrl}/auth/callback` },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Could not start Apple sign-in.")}`
    );
  }

  redirect(data.url);
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/account");
}
