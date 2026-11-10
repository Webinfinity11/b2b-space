/** Badge colors (admin picks one of these). */
export const BADGE_COLORS = ["blue", "violet", "green", "gold", "red", "gray"] as const;
export const BADGE_STYLE: Record<string, string> = {
  blue: "bg-blue-soft text-accent",
  violet: "bg-[#f0eaff] text-[#6644ad]",
  green: "bg-[#e3f4ec] text-[#20815d]",
  gold: "bg-[#fff4dc] text-[#a06a12]",
  red: "bg-[#fde8e8] text-[#c53030]",
  gray: "bg-chip text-secondary",
};
