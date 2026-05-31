import Link from "next/link";
import AuthCard from "@/components/layout/AuthCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";
import SocialAuthButtons from "@/components/ui/SocialAuthButtons";
import { signIn } from "@/lib/auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <PageShell>
      <AuthCard title="Log in" description="Welcome back to Loopawear">
        <div className="mt-8">
          <SocialAuthButtons />
        </div>
        <form action={signIn} className="flex flex-col gap-4">
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
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-medium text-zinc-400"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : null}

          <Button type="submit" fullWidth>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-zinc-700 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </PageShell>
  );
}