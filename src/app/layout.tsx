import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KoreFi | Restaurant intelligence",
  description: "Unified revenue, payout and restaurant performance intelligence.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
