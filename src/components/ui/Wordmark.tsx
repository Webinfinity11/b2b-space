/** "SGBA" + "BUSINESS NETWORK" two-line wordmark. */
export function Wordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const big = size === "lg" ? "text-[27px]" : size === "sm" ? "text-[19px]" : "text-[23px]";
  const small = size === "lg" ? "text-[10px]" : "text-[8.5px]";
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`${big} font-bold tracking-[-0.5px] text-ink`}>SGBA</span>
      <span className={`${small} mt-1 font-bold tracking-[0.22em] text-accent`}>BUSINESS NETWORK</span>
    </span>
  );
}
