import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Raise the server-action body-size limit so phone photos (3-8 MB)
  // can be uploaded. The default 1 MB was causing HTTP 400 on mobile.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
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
