import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uni AI",
  description: "A focused AI workspace for software reasoning.",
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
