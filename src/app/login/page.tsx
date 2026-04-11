import Link from "next/link";
import Button from "@/components/ui/Button";
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
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
          />
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
