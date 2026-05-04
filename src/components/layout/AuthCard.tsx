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
    <div className="w-full max-w-sm rounded-2xl border border-zinc-800/60 bg-zinc-950 p-8">
      <h1 className="bg-gradient-to-b from-white to-zinc-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent">{title}</h1>
      <p className="mt-2 text-sm text-zinc-500">{description}</p>
      {children}
    </div>
  );
}
