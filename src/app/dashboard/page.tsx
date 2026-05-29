import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';
import db from '@/lib/db';
import type { User } from '@/lib/db';

/**
 * /dashboard bestaat alleen nog voor backwards-compatibiliteit.
 * Alle gebruikers worden doorgestuurd naar hun organisatie-dashboard.
 */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const orgs = getUserOrgs(session.id);

  if (orgs.length === 0) {
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;
    if (user?.role === 'admin') redirect('/admin');
    redirect('/no-organisation');
  }
  if (orgs.length === 1) redirect(`/org/${orgs[0].slug}`);

  // Meerdere orgs: stuur naar select-org kiezer
  redirect('/select-org');
}
