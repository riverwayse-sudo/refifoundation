import type { Metadata } from "next";
import "../styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "REFI Foundation | Building opportunity, strengthening communities",
  description:
    "REFI Foundation supports practical opportunities for children, young people and communities across Africa.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
