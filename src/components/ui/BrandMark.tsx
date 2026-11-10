/** B2B Space bar mark (from the dashboard design). */
export function BrandMarkSvg({ className = "h-[42px] w-[31px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 52" aria-hidden="true" className={className}>
      <path fill="#1d45d1" d="M3 1h18v50H3z" />
      <path fill="#7fa0ff" d="m21 1 14 11v11L21 14z" />
      <path fill="#1440cf" d="M21 14 35 23l-14 9z" />
      <path fill="#4270f5" d="m21 27 14 10v8l-14 6z" />
      <path fill="#1440cf" d="M3 51 21 34v17Z" />
    </svg>
  );
}
