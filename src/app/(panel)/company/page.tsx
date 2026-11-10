import { redirect } from "next/navigation";

/** The company area opens on the profile editor. */
export default function CompanyPage() {
  redirect("/company/profile");
}
