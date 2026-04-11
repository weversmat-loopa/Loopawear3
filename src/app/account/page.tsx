import PageShell from "@/components/layout/PageShell";

export default function AccountPage() {
  return (
    <PageShell>
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        Account
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        Your account
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        Your profile, designs, and settings will live here once authentication is set up.
      </p>
    </PageShell>
  );
}
