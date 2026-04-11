import Link from "next/link";
import PageShell from "@/components/layout/PageShell";

export default function SignupPage() {
  return (
    <PageShell>
      <div className="w-full max-w-sm text-left">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Create an account
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Join Loopawear and start creating
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
          <button className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-opacity hover:opacity-75">
            Create account
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-zinc-300 transition-colors hover:text-white"
          >
            Log in
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
