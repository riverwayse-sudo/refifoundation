import type { Metadata, Viewport } from "next";
import "../styles/tokens.css";
import "./globals.css";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://therefifoundation.org").replace(/\/+$/, "");
const siteDescription =
  "REFI Foundation supports practical opportunities for children, young people and communities through education, sport, wellbeing and community-led action.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "REFI Foundation | Building opportunity, strengthening communities",
    template: "%s | REFI Foundation",
  },
  description: siteDescription,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "REFI Foundation",
    title: "REFI Foundation | Building opportunity, strengthening communities",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "REFI Foundation | Building opportunity, strengthening communities",
    description: siteDescription,
  },
  robots: { index: true, follow: true },
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
