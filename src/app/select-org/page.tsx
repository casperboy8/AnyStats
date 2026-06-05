import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getUserOrgs } from '@/lib/org';

export default async function SelectOrgPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const orgs = getUserOrgs(session.id);

  if (orgs.length === 0) redirect('/no-organisation');
  if (orgs.length === 1) redirect(`/org/${orgs[0].slug}`);

  return (
    <div className="min-h-screen bg-[#f9f9f8] dark:bg-[#111113] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">Kies een groep</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Hallo {session.username}</p>
        </div>

        <div className="space-y-2">
          {orgs.map(org => (
            <Link
              key={org.id}
              href={`/org/${org.slug}`}
              className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <span className="text-amber-700 font-semibold text-sm">
                    {org.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{org.name}</span>
              </div>
              <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <form action="/api/auth/logout" method="POST" className="mt-8 text-center">
          <button type="submit" className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 transition-colors">
            Uitloggen
          </button>
        </form>
      </div>
    </div>
  );
}
