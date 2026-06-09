import Link from "next/link";
import { DoodleSparkle } from "@/components/ui/Doodles";

interface EmptyStateProps {
  /** Hoofdregel — hand-font, één zin */
  title: string;
  /** Lichte toelichting onder de koptekst */
  description: string;
  /** Optionele sticker-knop */
  action?: {
    label: string;
    href: string;
    /** Tailwind achtergrondkleur van de knop, bv. 'bg-brand-blue' — standaard brand-blue */
    color?: string;
  };
  /** Kleur van het sparkle-icoon, bv. 'text-brand-orange' — standaard brand-blue */
  sparkleColor?: string;
}

/**
 * Speelse, huisstijl-conforme lege staat.
 *
 * Gebruik in tabs / lijsten wanneer er (nog) geen data is.
 * Eigenaar vs. publiek: geef gewoon andere tekst / action mee via props.
 */
export default function EmptyState({
  title,
  description,
  action,
  sparkleColor = "text-brand-blue",
}: EmptyStateProps) {
  const btnColor = action?.color ?? "bg-brand-blue";

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700">
      {/* Sparkle-icoon — één, niet tien */}
      <DoodleSparkle className={`h-9 w-9 ${sparkleColor}`} />

      {/* Koptekst in hand-font */}
      <p className="mt-4 font-hand text-xl font-bold text-ink dark:text-zinc-100">
        {title}
      </p>

      {/* Toelichting */}
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {description}
      </p>

      {/* Optionele sticker-knop */}
      {action && (
        <Link
          href={action.href}
          className={`sticker-sm mt-6 inline-block rounded-full px-5 py-2 text-sm font-extrabold text-white ${btnColor}`}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
