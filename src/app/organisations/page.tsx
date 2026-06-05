import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';
import db from '@/lib/db';
import type { User } from '@/lib/db';

export default async function OrganisationsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const orgs = getUserOrgs(session.id);
  const dbUser = db.prepare('SELECT role FROM users WHERE id = ?').get(session.id) as Pick<User, 'role'> | undefined;
  const isSuperAdmin = dbUser?.role === 'admin';

  if (orgs.length === 0 && !isSuperAdmin) redirect('/no-organisation');
  if (orgs.length === 1 && !isSuperAdmin) redirect(`/org/${orgs[0].slug}`);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Mijn groepen</h1>
        {isSuperAdmin && (
          <Link
            href="/organisations/new"
            className="bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            + Nieuwe groep
          </Link>
        )}
      </div>

      {orgs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-4">Nog geen groepen aangemaakt.</p>
          {isSuperAdmin && (
            <Link href="/organisations/new" className="text-amber-600 hover:underline text-sm font-medium">
              Maak de eerste groep aan →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <Link
              key={org.id}
              href={`/org/${org.slug}`}
              className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-400 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{org.name}</p>
                {org.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{org.description}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                org.role === 'owner' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' :
                org.role === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' :
                'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>
                {org.role === 'owner' ? 'Eigenaar' : org.role === 'admin' ? 'Admin' : 'Lid'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
