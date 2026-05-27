import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import type { User } from '@/lib/db';

/**
 * Server-side toegangscontrole voor alle /admin/* pagina's.
 * Controleert de rol direct uit de DB (niet alleen uit de JWT),
 * zodat een verlopen/gewijzigde rol direct effect heeft.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  // Controleer de actuele rol in de DB, niet die in de JWT
  const user = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;

  if (!user || user.role !== 'admin') redirect('/dashboard');

  return <>{children}</>;
}
