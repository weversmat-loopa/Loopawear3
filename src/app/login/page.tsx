import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/layout/AuthCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your Loopawear account.",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <PageShell>
      <AuthCard title="Log in" description="Welcome back to Loopawear">
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-xs font-medium text-zinc-400">Email</label>
            <Input id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-zinc-400">Password</label>
            <Input id="password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" />
          </div>
          <Button type="submit" fullWidth>Log in</Button>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </PageShell>
  );
}
