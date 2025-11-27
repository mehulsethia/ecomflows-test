import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ecomflows Demo",
  description: "Demo dashboard and API scaffold for Ecomflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} antialiased bg-[#0b101b] text-white min-h-screen`}
      >
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
