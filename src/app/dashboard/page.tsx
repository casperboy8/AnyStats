import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';

/**
 * /dashboard bestaat alleen nog voor backwards-compatibiliteit.
 * Alle gebruikers worden doorgestuurd naar hun organisatie-dashboard.
 */
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const orgs = getUserOrgs(session.id);

  if (orgs.length === 0) {
    if (session.role === 'admin') redirect('/admin');
    redirect('/no-organisation');
  }
  if (orgs.length === 1) redirect(`/org/${orgs[0].slug}`);

  // Meerdere orgs: stuur naar select-org kiezer
  redirect('/select-org');
}
