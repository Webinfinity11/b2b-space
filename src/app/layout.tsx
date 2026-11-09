import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-georgian";
import "./globals.css";
import { ka } from "@/i18n/ka";
import { getTheme } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: ka.meta.title, template: `%s — ${ka.brand}` },
  description: ka.meta.description,
};

export const viewport: Viewport = {
  themeColor: "#071426",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dark is the default design; the light theme is opt-in via the header toggle.
  const theme = await getTheme();
  return (
    <html lang="ka" data-theme={theme === "light" ? "light" : undefined}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
