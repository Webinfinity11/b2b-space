import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[12px] font-bold transition-[background,box-shadow,transform] disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover hover:shadow-[0_6px_18px_rgb(35_80_230/0.18)] hover:-translate-y-px",
  secondary: "border border-line-strong bg-surface text-ink hover:border-accent/40 hover:bg-chip",
  ghost: "text-secondary hover:bg-chip hover:text-ink",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
  accent: "bg-accent text-white hover:bg-accent-hover",
};
const sizes: Record<Size, string> = {
  sm: "h-9 rounded-[10px] px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  // Full-width buttons may carry long Georgian labels — let them wrap instead of overflowing.
  const wrap = extra.includes("w-full") ? " !h-auto min-h-10 py-2.5 !whitespace-normal text-center leading-snug" : "";
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}${wrap}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  const href = typeof props.href === "string" ? props.href : "";
  // Route handlers (PDFs, files) are not pages — client-side routing can't render them.
  if (href.startsWith("/api/")) {
    const { href: _h, prefetch: _p, replace: _r, scroll: _s, ...rest } = props;
    void _h; void _p; void _r; void _s;
    return <a href={href} className={buttonClass(variant, size, className)} {...(rest as ComponentProps<"a">)} />;
  }
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
