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
  primary: "bg-violet-600 text-white transition-all duration-300 hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]",
  ghost: "border border-zinc-300 text-zinc-700 transition-all duration-300 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white",
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
