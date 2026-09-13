import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "./site-header";
import { ServiceWorkerRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "Arabic",
  description: "A personal Arabic study app.",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#2F6F62",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen font-sans antialiased">
        <ServiceWorkerRegister />
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
