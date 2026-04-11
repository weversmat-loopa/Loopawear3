import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PageShell from "@/components/layout/PageShell";

export default function LoginPage() {
  return (
    <PageShell>
      <div className="w-full max-w-sm text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Log in
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Welcome back to Loopawear
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Input type="email" placeholder="Email" />
          <Input type="password" placeholder="Password" />
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
      </div>
    </PageShell>
  );
}
