import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wolt Venue Tracker",
  description: "Track Wolt venues and get notified when they come back online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
