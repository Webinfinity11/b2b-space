import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ka } from "@/i18n/ka";

export const metadata: Metadata = { title: ka.reset.title };

/** "Forgot password" now opens inside the login card. */
export default function ForgotPasswordPage() {
  redirect("/login");
}
