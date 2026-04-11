import type { Metadata } from "next";
import MarketplaceBrowse from "./MarketplaceBrowse";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover and shop original AI-generated apparel from independent creators on Loopawear.",
};

export default function MarketplacePage() {
  return <MarketplaceBrowse />;
}
