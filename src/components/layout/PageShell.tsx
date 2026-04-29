export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
      {/* Ambient glow — creates depth and premium dark-UI feel */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet-500/[0.07] blur-[130px]" />
        <div className="absolute left-1/2 top-[20%] h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-violet-400/[0.04] blur-[80px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        {children}
      </div>
    </main>
  );
}
