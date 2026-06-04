/**
 * Hand-drawn doodle SVGs for the Loopawear playful-vintage aesthetic.
 * Used sparingly as accents around headings, hero, and brand moments —
 * never over the product presentation itself.
 *
 * Each doodle inherits `currentColor`, so colour it with text-brand-* /
 * text-ink utilities. Pass a className for size / rotation / position.
 */

type DoodleProps = {
  className?: string;
};

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** A wonky four-point star / sparkle */
export function DoodleStar({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        {...stroke}
        d="M20 4c1 7 3 9 13 11-9 2-12 4-13 11-1-7-4-9-13-11 9-2 12-4 13-11Z"
      />
    </svg>
  );
}

/** A hand-drawn curved arrow pointing right */
export function DoodleArrow({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden>
      <path {...stroke} d="M4 28C16 8 38 6 56 16" />
      <path {...stroke} d="M48 8c5 3 8 5 8 8 0 3-3 6-7 9" />
    </svg>
  );
}

/** A little sun with rays */
export function DoodleSun({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle {...stroke} cx="24" cy="24" r="9" />
      <path
        {...stroke}
        d="M24 4v5M24 39v5M4 24h5M39 24h5M10 10l3.5 3.5M34.5 34.5 38 38M38 10l-3.5 3.5M13.5 34.5 10 38"
      />
    </svg>
  );
}

/** A speaker / megaphone for announcements */
export function DoodleSpeaker({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden>
      <path {...stroke} d="M6 16v8a3 3 0 0 0 3 3h4l13 8V5L13 13H9a3 3 0 0 0-3 3Z" />
      <path {...stroke} d="M33 14c3 2 4.5 4 4.5 6s-1.5 4-4.5 6" />
      <path {...stroke} d="M38 8c5 3 7.5 7 7.5 12s-2.5 9-7.5 12" />
    </svg>
  );
}

/** A scribbly marker underline stroke, full width of its container */
export function DoodleUnderline({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" className={className} aria-hidden>
      <path
        {...stroke}
        strokeWidth={4}
        d="M4 9c40-5 90-6 140-3 18 1 36 3 52 6"
      />
    </svg>
  );
}

/** A small squiggle / wave accent */
export function DoodleSquiggle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 80 20" className={className} aria-hidden>
      <path {...stroke} d="M4 12c8-12 16 8 24 0s16-12 24 0 16 8 24 0" />
    </svg>
  );
}

/** A tiny circled heart / spark used as a bullet accent */
export function DoodleSpark({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path {...stroke} d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** A wonky hand-drawn heart */
export function DoodleHeart({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        {...stroke}
        d="M20 34C8 26 4 18 6 12c1.5-5 8-6 11-1 1 1.5 1.7 2.5 3 4 1.3-1.5 2-2.5 3-4 3-5 9.5-4 11 1 2 6-2 14-14 22Z"
      />
    </svg>
  );
}

/** A little lightning bolt */
export function DoodleBolt({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden>
      <path {...stroke} d="M19 4 6 23h9l-3 13 14-20h-9l3-12Z" />
    </svg>
  );
}

/** A puffy little cloud */
export function DoodleCloud({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 56 36" className={className} aria-hidden>
      <path
        {...stroke}
        d="M14 30c-6 0-10-4-10-9s4-9 9-8c1-5 6-9 12-9s11 4 12 9c5-1 9 3 9 8s-4 9-10 9H14Z"
      />
    </svg>
  );
}

/** A loose five-petal flower */
export function DoodleFlower({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 44 44" className={className} aria-hidden>
      <circle {...stroke} cx="22" cy="22" r="4" />
      <path
        {...stroke}
        d="M22 18c-2-6-1-11 0-12 1 1 2 6 0 12ZM25 20c5-4 10-4 11-3-0 1-3 5-9 5ZM24 25c3 5 2 10 1 11-1-1-4-4-3-9ZM20 25c-3 5-7 6-9 6 0-1 1-5 7-7ZM19 20c-5-4-9-4-10-3 0 1 2 5 8 5Z"
      />
    </svg>
  );
}

/** A spiral / swirl */
export function DoodleSwirl({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        {...stroke}
        d="M20 8c7 0 12 5 12 12s-5 11-11 11-9-4-9-9 3-7 7-7 5 2 5 5-1 3-3 3"
      />
    </svg>
  );
}

/** Three scattered dots / confetti */
export function DoodleDots({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 28" className={className} aria-hidden>
      <circle {...stroke} cx="8" cy="20" r="3" />
      <circle {...stroke} cx="22" cy="8" r="3" />
      <circle {...stroke} cx="34" cy="19" r="3" />
    </svg>
  );
}

/** A small three-point sparkle / twinkle */
export function DoodleSparkle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path
        {...stroke}
        d="M16 4c.8 6 2 8 11 9-9 1-10.2 3-11 12-.8-9-2-11-11-12 9-1 10.2-3 11-9Z"
      />
    </svg>
  );
}
