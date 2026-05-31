import Link from "next/link";
import AuthCard from "@/components/layout/AuthCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";
import SocialAuthButtons from "@/components/ui/SocialAuthButtons";
import { signUp } from "@/lib/auth/actions";

type SignupPageProps = {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;
  const checkEmail = message === "check_email";

  return (
    <PageShell>
      <AuthCard
        title="Create an account"
        description={
          checkEmail
            ? "One more step — check your inbox."
            : "Join Loopawear and start creating"
        }
      >
        {checkEmail ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-zinc-400">
              We sent a confirmation link to your email address. Click it to
              activate your account, then{" "}
              <Link
                href="/login"
                className="text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
              >
                log in
              </Link>
              .
            </p>
            <p className="text-xs text-zinc-600">
              Didn&apos;t receive it? Check your spam folder.
            </p>
          </div>
        ) : (
        <>
          <div className="mt-8">
            <SocialAuthButtons />
          </div>
          <form action={signUp} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-400"
            >
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />
          </div>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}

          <Button type="submit" fullWidth>
            Create account
          </Button>
        </form>
        </>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Log in
          </Link>
        </p>
      </AuthCard>
    </PageShell>
  );
}