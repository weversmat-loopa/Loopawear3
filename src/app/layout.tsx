import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { createClient } from "@/utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar user={user} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
