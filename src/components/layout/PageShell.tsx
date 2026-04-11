export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-black px-6 text-center">
      {children}
    </main>
  );
}
