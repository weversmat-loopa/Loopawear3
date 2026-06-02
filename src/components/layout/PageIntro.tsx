interface PageIntroProps {
  eyebrow: string;
  heading: string;
  description: string;
}

export default function PageIntro({ eyebrow, heading, description }: PageIntroProps) {
  return (
    <>
      <span className="mb-6 inline-block -rotate-2 rounded-full border-2 border-ink bg-brand-yellow px-4 py-1 font-hand text-base font-bold text-ink">
        {eyebrow}
      </span>
      <h1 className="font-display text-5xl text-ink sm:text-6xl">
        {heading}
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-500">
        {description}
      </p>
    </>
  );
}
