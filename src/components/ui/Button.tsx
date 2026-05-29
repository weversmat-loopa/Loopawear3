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
  primary: "bg-zinc-900 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100",
  ghost: "border border-zinc-900 text-zinc-900 bg-white transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-100 dark:bg-transparent dark:hover:bg-zinc-800",
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
