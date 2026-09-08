import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getUserOrgs } from "@/lib/org";
import db from "@/lib/db";
import type { User } from "@/lib/db";
import LandingPage from "./_components/LandingPage";

export default async function HomePage() {
  const session = await getSession();
  if (!session) return <LandingPage />;

  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(session.id) as Pick<User, "role"> | undefined;
  const role = user?.role ?? session.role;
  const orgs = getUserOrgs(session.id);

  if (orgs.length === 0) {
    if (role === "admin") redirect("/admin");
    redirect("/no-organisation");
  }
  // Any's/barf zijn niet groep-gebonden — er hoeft geen groep gekozen te
  // worden om iets te doen, dus iedereen gaat direct naar het dashboard.
  redirect("/dashboard");
}
