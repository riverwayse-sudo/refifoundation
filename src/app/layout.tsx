import type { Metadata, Viewport } from "next";
import "../styles/tokens.css";
import "./globals.css";

const siteUrl = "https://refifoundation.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "REFI Foundation | Building opportunity, strengthening communities",
    template: "%s | REFI Foundation",
  },
  description:
    "REFI Foundation supports practical opportunities for children, young people and communities across Africa.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "REFI Foundation",
    title: "REFI Foundation | Building opportunity, strengthening communities",
    description:
      "Practical opportunities for children, young people and communities across Africa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "REFI Foundation | Building opportunity, strengthening communities",
    description:
      "Practical opportunities for children, young people and communities across Africa.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B2856",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
