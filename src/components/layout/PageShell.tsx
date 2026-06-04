import {
  DoodleStar,
  DoodleSparkle,
  DoodleSwirl,
  DoodleDots,
  DoodleSquiggle,
} from "@/components/ui/Doodles";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Loose doodles scattered in the margins around the centered card */}
      <DoodleStar
        aria-hidden
        className="doodle-twinkle pointer-events-none absolute left-10 top-16 hidden h-9 w-9 -rotate-12 text-brand-orange md:block lg:left-24"
      />
      <DoodleSparkle
        aria-hidden
        className="doodle-twinkle pointer-events-none absolute right-12 top-24 hidden h-8 w-8 text-brand-yellow md:block lg:right-28"
      />
      <DoodleSwirl
        aria-hidden
        className="doodle-sway pointer-events-none absolute bottom-20 left-16 hidden h-10 w-10 text-brand-blue/70 lg:block"
      />
      <DoodleDots
        aria-hidden
        className="pointer-events-none absolute bottom-24 right-16 hidden h-7 w-10 text-brand-green md:block lg:right-32"
      />
      <DoodleSquiggle
        aria-hidden
        className="pointer-events-none absolute right-1/4 top-12 hidden h-3 w-16 text-brand-orange/50 lg:block"
      />

      <div className="relative z-10 flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}
