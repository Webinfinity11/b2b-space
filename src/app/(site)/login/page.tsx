import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { getCurrentUser } from "@/lib/session";
import { param } from "@/lib/params";
import { AuthScreen } from "@/components/site/AuthScreen";

export const metadata: Metadata = { title: ka.auth.loginTitle };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.platformRole === "ADMIN" ? "/admin" : "/app");
  return <AuthScreen tab="login" next={param(sp.next, 300)} registered={param(sp.registered) === "1"} reset={param(sp.reset) === "1"} />;
}
