import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nicole Raithel Styles · Client Portal",
  description: "Your personal styling recommendations, wardrobe, and conversations.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
