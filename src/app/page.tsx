import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/org";
import db from "@/lib/db";
import type { User } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(session.id) as Pick<User, "role"> | undefined;
  const role = user?.role ?? session.role;
  const orgs = getUserOrgs(session.id);

  if (orgs.length === 0) {
    if (role === "admin") redirect("/admin");
    redirect("/no-organisation");
  }
  if (orgs.length === 1) redirect(`/org/${orgs[0].slug}`);
  redirect("/select-org");
}
