import "server-only";
import { cookies } from "next/headers";

export async function getTheme(): Promise<"dark" | "light"> {
  const jar = await cookies();
  return jar.get("b2b_theme")?.value === "light" ? "light" : "dark";
}
