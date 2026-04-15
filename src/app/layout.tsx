import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getSiteUrl } from "@/app/lib/site-url";
import QueryProvider from "./providers/QueryProvider";
import ReduxProvider from "./providers/ReduxProvider";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/favicon.ico",
  },
  title: {
    default: "E-Commerce",
    template: "%s | E-Commerce",
  },
  description:
    "Shop online with Next.js App Router — fast delivery and secure checkout.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en",
    url: siteUrl,
    siteName: "E-Commerce",
    title: "E-Commerce",
    description:
      "Shop online with Next.js App Router — fast delivery and secure checkout.",
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Commerce",
    description:
      "Shop online with Next.js App Router — fast delivery and secure checkout.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} bg-white text-black min-h-screen antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <ReduxProvider>{children}</ReduxProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
