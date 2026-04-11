interface PageIntroProps {
  eyebrow: string;
  heading: string;
  description: string;
}

export default function PageIntro({ eyebrow, heading, description }: PageIntroProps) {
  return (
    <>
      <span className="mb-6 rounded-full border border-zinc-800 px-4 py-1 text-xs font-medium uppercase tracking-widest text-zinc-500">
        {eyebrow}
      </span>
      <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
        {heading}
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-zinc-400">
        {description}
      </p>
    </>
  );
}
