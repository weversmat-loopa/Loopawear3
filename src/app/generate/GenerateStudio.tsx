"use client";

import { useState } from "react";

export default function GenerateStudio() {
  const [prompt, setPrompt] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // AI generation will be wired in here
  }

  return (
    <main className="flex flex-1 flex-col bg-black px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Design Studio
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Describe your design and let AI bring it to life.
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label
            htmlFor="prompt"
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Prompt
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the design you want to create — style, colors, motifs, mood..."
            className="mt-2 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-zinc-600"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-75 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate
            </button>
          </div>
        </form>

        <div className="mt-10 flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-800">
          <p className="text-sm text-zinc-600">Your design will appear here</p>
        </div>
      </div>
    </main>
  );
}
