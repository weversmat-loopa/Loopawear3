import type { Metadata } from "next";
import AuthCard from "@/components/layout/AuthCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";
import { updatePassword } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Set new password",
  robots: { index: false },
};

type Props = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <PageShell>
      <AuthCard
        title="Set new password"
        description="Choose a strong password for your account."
      >
        <form action={updatePassword} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-400"
            >
              New password
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

          {error && (
            <p className="text-sm text-red-400">
              {decodeURIComponent(error)}
            </p>
          )}

          <Button type="submit" fullWidth>
            Update password
          </Button>
        </form>
      </AuthCard>
    </PageShell>
  );
}
