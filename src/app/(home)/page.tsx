import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

/** Closed platform: guests go to the sign-in page, members to their workspace. */
export default async function HomePage() {
  const user = await getCurrentUser();
  redirect(!user ? "/login" : user.platformRole === "ADMIN" ? "/admin" : "/app");
}
