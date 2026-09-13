import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "./site-header";

export const metadata: Metadata = {
  title: "Arabic",
  description: "A personal Arabic study app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
