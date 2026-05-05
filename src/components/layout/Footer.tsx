export default function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
        © {new Date().getFullYear()} Loopawear &mdash; AI-powered apparel marketplace
      </p>
    </footer>
  );
}
