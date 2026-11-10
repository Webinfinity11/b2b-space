import "server-only";
import { cookies } from "next/headers";

export const THEME_COOKIE = "b2b_theme";

/** Light is the default; dark is opt-in via the top-bar switch. */
export async function getTheme(): Promise<"light" | "dark"> {
  const jar = await cookies();
  return jar.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}
