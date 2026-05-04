import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/layout/AuthCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";
import { requestPasswordReset } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

type Props = {
  searchParams?: Promise<{ sent?: string; error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const sent = params?.sent === "1";
  const error = params?.error;

  return (
    <PageShell>
      <AuthCard
        title="Reset your password"
        description={
          sent
            ? "Check your inbox for a reset link."
            : "Enter your email and we'll send you a reset link."
        }
      >
        {sent ? (
          <p className="mt-8 text-sm text-zinc-400">
            If an account exists for that address, you&apos;ll receive a password
            reset email shortly. Check your spam folder if it doesn&apos;t arrive.
          </p>
        ) : (
          <form action={requestPasswordReset} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-zinc-400"
              >
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-400">
                {decodeURIComponent(error)}
              </p>
            )}

            <Button type="submit" fullWidth>
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link
            href="/login"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Back to log in
          </Link>
        </p>
      </AuthCard>
    </PageShell>
  );
}
