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
    <div className="ink-card w-full max-w-sm rounded-2xl bg-paper p-8 dark:bg-zinc-900">
      <h1 className="font-display text-2xl text-ink">{title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
      {children}
    </div>
  );
}
