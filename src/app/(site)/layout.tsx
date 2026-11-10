/** Guest area (sign-in, company registration, legal pages): no workspace shell. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
