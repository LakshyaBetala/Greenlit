import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Greenlit — CTO in a Box for AI-Built Apps",
  description:
    "Your CTO in a box. Paste your repo — Greenlit explains what you built, finds the security holes, proves they're real, and writes the fix. Paste it into Cursor. Done.",
  keywords: [
    "CTO in a box",
    "vibe coding security",
    "AI app security audit",
    "Lovable security scanner",
    "Bolt security",
    "Cursor security",
    "auto-fix vulnerabilities",
    "GitHub repo security",
    "non-technical founder security",
    "India startup security",
  ],
  openGraph: {
    title: "Greenlit — CTO in a Box for AI-Built Apps",
    description: "You built it with AI. We protect it with AI. Scan → Understand → Fix.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
