import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';

/** Globaal klassement bestaat niet meer — stuur door naar de groep. */
export default async function LeaderboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const orgs = getUserOrgs(session.id);
  if (orgs.length === 1) redirect(`/org/${orgs[0].slug}/leaderboard`);
  redirect('/select-org');
}
