import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Monetizely — Quoting Tool",
  description:
    "Design and operationalize SaaS pricing. Set up product catalogs and generate shareable customer quotes with transparent line-item math.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
