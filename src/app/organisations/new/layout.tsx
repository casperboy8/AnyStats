import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { User } from '@/lib/db';

export default async function NewOrganisationLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;
  if (!user || user.role !== 'admin') redirect('/dashboard');

  return <>{children}</>;
}
