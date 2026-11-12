import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans";
import "@fontsource-variable/noto-sans-georgian";
import "./globals.css";
import { ka } from "@/i18n/ka";
import { getTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: ka.meta.title, template: `%s — ${ka.brand}` },
  description: ka.meta.description,
  // Closed members-only platform: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = await getTheme();
  return (
    <html lang="ka" data-theme={theme === "dark" ? "dark" : undefined}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
