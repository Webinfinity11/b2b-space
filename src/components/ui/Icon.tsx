/** Minimal line icon set (24×24, stroke). */
/** Icons from the B2B Space dashboard design (inner SVG markup, static). */
const RAW: Record<string, string> = {
  home: "<path d=\"m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1Z\"/>",
  tag: "<path d=\"M20 3h-7L3 13a2 2 0 0 0 0 3l5 5a2 2 0 0 0 3 0L21 11V4a1 1 0 0 0-1-1Z\"/><circle cx=\"17\" cy=\"7\" r=\"1\"/>",
  building: "<path d=\"M3 21V5l8-2v18M11 7h9v14M1 21h22M6 7h2M6 11h2M6 15h2M15 10h2M15 14h2M15 18h2M6 21v-3h2v3\"/>",
  bell: "<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10ZM10 21h4M12 2V1\"/>",
  users: "<circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M1 21v-2a8 8 0 0 1 16 0v2M17 3a4 4 0 0 1 0 8M18 14a6 6 0 0 1 5 6v1\"/>",
  chart: "<path d=\"M3 21V11M8 21V7M13 21V13M18 21V3M23 21V1\"/>",
  settings: "<path d=\"m9 2-1 3-3 1-3 3 2 3-1 3 3 3 3-1 3 2 3-2 3 1 3-3-1-3 2-3-3-3-3-1-1-3H9Z\"/><circle cx=\"12\" cy=\"11\" r=\"3.5\"/>",
  search: "<circle cx=\"10.5\" cy=\"10.5\" r=\"7.5\"/><path d=\"m16 16 6 6\"/>",
  chat: "<path d=\"M3 3h18v14H8l-5 5V3Z\"/>",
  trend: "<path d=\"m2 20 7-8 5 4 8-11M15 5h7v7\"/>",
  box: "<path d=\"m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10L3 7m9 5 9-5M12 12v10M7 4.8l10 5.4\"/>",
  arrow: "<path d=\"M4 12h15m-5-5 5 5-5 5\"/>",
  plus: "<path d=\"M12 4v16M4 12h16\"/>",
  megaphone: "<path d=\"m3 8 9-2 8-3v18l-8-3-9-2V8ZM12 6v12M5 17l2 5h4l-2-5M20 8a4 4 0 0 1 0 8\"/>",
  handshake: "<path d=\"m2 7 3-3 5 2 4-1 3 1 3-2 3 7-3 2M1 8l2 8 3-1M5 5l-3 9M18 6l4 8M10 6l-4 5 2 2 5-4 7 6-1 3-2 1-2 2-3 1-7-7M8 17l2-2M11 20l2-3M15 20l1-2\"/>",
  coins: "<ellipse cx=\"14\" cy=\"5\" rx=\"7\" ry=\"3\"/><path d=\"M7 5v4c0 2 3 3 7 3s7-1 7-3V5M7 9v4c0 2 3 3 7 3s7-1 7-3V9M21 13v4c0 2-3 3-7 3M3 10c-1 .5-2 1-2 2 0 2 3 3 7 3M1 12v4c0 2 3 3 7 3M1 16v3c0 2 3 3 7 3s7-1 7-3v-3\"/>",
  mail: "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"1\"/><path d=\"m2 5 10 8L22 5\"/>",
  car: "<path d=\"m5 8 2-6h10l2 6M3 9h18v10H3V9ZM5 19v3M19 19v3M7 13h1M16 13h1M3 16h18\"/>",
  calendar: "<rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"1\"/><path d=\"M7 1v6M17 1v6M3 10h18\"/>",
  bank: "<path d=\"m2 8 10-6 10 6H2ZM3 22h18M2 19h20M6 10v7M10 10v7M14 10v7M18 10v7\"/>",
  star: "<path d=\"m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z\"/>",
  file: "<path d=\"M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6ZM14 2v6h6M8 12h8M8 16h8M8 19h5\"/>",
  chevron: "<path d=\"m6 9 6 6 6-6\"/>",
  menu: "<path d=\"M3 6h18M3 12h18M3 18h18\"/>",
};

const PATHS = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0",
  chat: "M4 5h16v11H8l-4 4z",
  invoice: "M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
  tag: "M3 12V4h8l10 10-8 8zM7.5 7.5h.01",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5-2 5 5",
  inbox: "M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z",
  building: "M4 21V4h11v17M15 9h5v12M8 8h3M8 12h3M8 16h3M2 21h20",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM1 21a8 8 0 0 1 16 0M17 3a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7.4",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  plus: "M12 5v14M5 12h14",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  check: "M4 12l5 5L20 6",
  folder: "M3 6h6l2 2h10v11H3z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM12 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z",
  logout: "M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5M9 12h12m-4-4 4 4-4 4",
  sparkle: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5ZM20 2v4M18 4h4",
  arrowUp: "M5 19 19 5M6 5h13v13",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
  trend: "m3 17 6-6 4 4 8-10M15 5h6v6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  box: "m12 2 10 5-10 5L2 7ZM2 7v10l10 5 10-5V7M12 12v10",
  megaphone: "",
  handshake: "",
  coins: "",
  mail: "",
  car: "",
  calendar: "",
  bank: "",
  star: "",
  file: "",
  chevron: "",
  menu: "",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {RAW[name] ? <g dangerouslySetInnerHTML={{ __html: RAW[name] }} /> : <path d={PATHS[name]} />}
    </svg>
  );
}
