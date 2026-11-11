import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";
import { getCurrentUser } from "@/lib/session";
import { param } from "@/lib/params";
import { AuthScreen } from "@/components/site/AuthScreen";

export const metadata: Metadata = { title: ka.sgba.regTitle };

/** Only companies register. Invited employees arrive with the secret link from their invitation (?invite=…). */
export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  if (await getCurrentUser()) redirect("/app");
  const invite = param(sp.invite) ?? "";
  return <AuthScreen tab="register" invited={Boolean(invite) || param(sp.invited) === "1"} inviteToken={invite} />;
}
