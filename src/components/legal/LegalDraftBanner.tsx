import { businessInfoComplete } from "@/lib/legal/businessInfo";
import { DoodleBolt } from "@/components/ui/Doodles";

/**
 * Shown on all legal pages as long as businessInfo.ts still contains
 * placeholder values. Disappears automatically once every field is filled in.
 */
export default function LegalDraftBanner() {
  if (businessInfoComplete) return null;

  return (
    <div className="border-b-2 border-brand-orange/40 bg-brand-yellow/20 px-6 py-3 dark:border-brand-orange/30 dark:bg-brand-orange/10">
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <DoodleBolt className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
        <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
          <span className="font-bold text-brand-orange">Concept — not yet legally verified.</span>{" "}
          This page contains draft text that has not been reviewed by a lawyer.
          It must not be published until all placeholder fields in{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[11px] dark:bg-white/10">
            src/lib/legal/businessInfo.ts
          </code>{" "}
          have been filled in and the content has been verified by a qualified legal professional.
          This banner disappears automatically once all fields are complete.
        </p>
      </div>
    </div>
  );
}
