/* eslint-disable @next/next/no-img-element -- user uploads served from /files */
export function CompanyLogo({ name, url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const radius = size >= 64 ? 12 : 10;
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 border border-line bg-surface object-contain p-1"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const initials = name.replace(/["„“«»]/g, "").replace(/^შპს\s*/, "").trim().slice(0, 2);
  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 place-items-center bg-gradient-to-br from-accent/25 to-accent/5 font-bold text-accent ring-1 ring-inset ring-accent/15"
      style={{ width: size, height: size, fontSize: size * 0.32, borderRadius: radius }}
    >
      {initials}
    </div>
  );
}
