import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LearnViet - Contextual learning by Chace Teo",
  description: "A gamified Vietnamese language-learning app crafted by Chace Teo. Master 2,000 conversational words through contextual deduction and real-world scenarios.",
  authors: [{ name: "Chace Teo" }],
  keywords: ["Vietnamese", "Language Learning", "Chace Teo", "Contextual Learning", "Deduction Game"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
