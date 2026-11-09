import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-georgian";
import "./globals.css";
import { ka } from "@/i18n/ka";

export const metadata: Metadata = {
  title: { default: ka.meta.title, template: `%s — ${ka.brand}` },
  description: ka.meta.description,
};

export const viewport: Viewport = {
  themeColor: "#071426",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ka">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
