import { InputHTMLAttributes } from "react";

export default function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "w-full rounded-xl border-2 border-ink bg-paper px-4 py-3 text-sm font-medium text-ink placeholder:text-zinc-400 outline-none transition-shadow focus:shadow-[2px_2px_0_0_var(--ink)] dark:bg-zinc-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
