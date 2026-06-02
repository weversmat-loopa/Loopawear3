import Link from "next/link";

interface ButtonProps {
  variant?: "primary" | "ghost" | "blue" | "orange" | "green";
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
}

// Sticker-style buttons: hard ink border + offset shadow that presses in on
// click (animation handled by the `.sticker` class in globals.css).
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "sticker bg-ink text-paper",
  blue: "sticker bg-brand-blue text-white",
  orange: "sticker bg-brand-orange text-white",
  green: "sticker bg-brand-green text-white",
  ghost: "sticker bg-paper text-ink",
};

export default function Button({
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
  href,
  type = "button",
}: ButtonProps) {
  const classes = [
    "rounded-full py-3 text-sm font-extrabold",
    fullWidth ? "w-full" : "inline-block px-8",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}
