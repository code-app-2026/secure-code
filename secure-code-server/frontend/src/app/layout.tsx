import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import IdleTimer from "@/components/IdleTimer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Secure Code Server",
  description: "Browser-based secure coding environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.className} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <IdleTimer>
          {children}
        </IdleTimer>
      </body>
    </html>
  );
}
