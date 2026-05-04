export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-6 py-5">
      <p className="text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Loopawear &mdash; AI-powered apparel marketplace
      </p>
    </footer>
  );
}
