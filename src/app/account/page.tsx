import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import PageIntro from "@/components/layout/PageIntro";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your designs, orders, and creator profile.",
  robots: { index: false },
};

export default function AccountPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Account"
        heading="Your account"
        description="Manage your designs, orders, and creator profile — all in one place."
      />
    </PageShell>
  );
}
