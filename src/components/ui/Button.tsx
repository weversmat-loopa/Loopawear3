import Link from "next/link";

interface ButtonProps {
  variant?: "primary" | "ghost";
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-white text-black transition-opacity hover:opacity-75",
  ghost:
    "border border-zinc-700 text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white",
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
    "rounded-full py-3 text-sm font-semibold",
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
