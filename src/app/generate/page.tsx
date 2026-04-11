import type { Metadata } from "next";
import GenerateStudio from "./GenerateStudio";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Design unique apparel with AI. Describe your vision and let AI bring it to life.",
};

export default function GeneratePage() {
  return <GenerateStudio />;
}
