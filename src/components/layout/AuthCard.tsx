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
    <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
      {children}
    </div>
  );
}
