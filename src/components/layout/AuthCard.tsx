import { DoodleStar, DoodleSparkle } from "@/components/ui/Doodles";

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function AuthCard({
  title,
  description,
  children,
}: AuthCardProps) {
  return (
    <div className="relative w-full max-w-sm">
      {/* Doodles peek out of the card's frame, never over the fields */}
      <DoodleStar
        aria-hidden
        className="doodle-twinkle pointer-events-none absolute -right-4 -top-5 z-10 h-9 w-9 rotate-12 text-brand-orange"
      />
      <DoodleSparkle
        aria-hidden
        className="doodle-twinkle pointer-events-none absolute -bottom-4 -left-4 z-10 h-7 w-7 text-brand-yellow"
      />
      <div className="ink-card rounded-2xl bg-paper p-8 dark:bg-zinc-900">
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{description}</p>
        {children}
      </div>
    </div>
  );
}
