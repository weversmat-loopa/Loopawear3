import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
          <Input type="email" placeholder="Email" />
          <Input type="password" placeholder="Password" />
          <Button type="submit" fullWidth>Create account</Button>
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
