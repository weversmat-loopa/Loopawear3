export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="relative z-10 flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}
