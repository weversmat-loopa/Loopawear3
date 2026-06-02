import type { Metadata } from "next";
import {
  Nunito,
  Archivo_Black,
  Permanent_Marker,
  Caveat,
} from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/utils/supabase/server";

// Body text
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

// Display / brand headings
const archivoBlack = Archivo_Black({
  variable: "--font-archivo",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Marker brand moments
const permanentMarker = Permanent_Marker({
  variable: "--font-marker",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// Handwritten accents
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://project-8lsdx.vercel.app"),
  title: {
    template: "%s | Loopawear",
    default: "Loopawear",
  },
  description: "AI-powered apparel marketplace. Generate designs, create products, and sell to the world.",
  openGraph: {
    type: "website",
    siteName: "Loopawear",
    title: "Loopawear",
    description: "AI-powered apparel marketplace. Generate designs, create products, and sell to the world.",
  },
  twitter: {
    card: "summary",
    title: "Loopawear",
    description: "AI-powered apparel marketplace. Generate designs, create products, and sell to the world.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let user = null;
  let isAdmin = false;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
  } catch {
    // Supabase unreachable — render layout unauthenticated rather than crash.
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} ${archivoBlack.variable} ${permanentMarker.variable} ${caveat.variable} h-full antialiased`}
    >
      <head>
        {/* Runs synchronously before paint — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('loopawear-theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Navbar user={user} isAdmin={isAdmin} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
