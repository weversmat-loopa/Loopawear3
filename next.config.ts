import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow next/image to optimize design artwork served from Supabase
    // Storage and the fal.ai CDN. Supabase URLs are scoped to the public
    // object path so private storage stays uncovered. fal.media wildcards
    // cover the various regional CDN subdomains fal returns.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yyfwcubpgkcuhdwfbiit.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "**.fal.media" },
    ],
  },
};

export default nextConfig;
