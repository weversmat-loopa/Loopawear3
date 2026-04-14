import type { Metadata } from "next";
import GenerateStudio from "./GenerateStudio";

export const metadata: Metadata = {
  title: "Design Studio",
  description: "Design unique apparel with AI. Describe your vision and let AI bring it to life.",
};

type GeneratePageProps = {
  searchParams?: Promise<{
    prompt?: string;
    product_type?: string;
    style?: string;
  }>;
};

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
  const sp = await searchParams;
  return (
    <GenerateStudio
      initialPrompt={sp?.prompt ?? ""}
      initialProductType={sp?.product_type ?? null}
      initialStyle={sp?.style ?? null}
    />
  );
}
