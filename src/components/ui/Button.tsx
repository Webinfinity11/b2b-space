import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-navy hover:bg-accent-hover shadow-[0_4px_0_rgb(142_197_237/0.06)]",
  secondary: "border border-line bg-transparent text-ink hover:border-accent/40 hover:bg-accent/5",
  ghost: "text-secondary hover:bg-accent/[0.065] hover:text-ink",
  danger: "bg-danger/15 text-danger hover:bg-danger/25",
  accent: "bg-accent text-navy hover:bg-accent-hover",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
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
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
