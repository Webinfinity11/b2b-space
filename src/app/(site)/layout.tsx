import { SiteShell } from "@/components/site/SiteShell";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
