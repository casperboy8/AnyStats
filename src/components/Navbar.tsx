'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

type Props = {
  user: { username: string; role: string } | null;
};

export default function Navbar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
        <div className="flex items-center gap-5">
          <Link href="/dashboard" className="font-semibold text-gray-900 text-sm tracking-tight">
            Anytimer
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm transition-colors ${pathname === '/dashboard' ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            className={`text-sm transition-colors ${pathname === '/leaderboard' ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Klassement
          </Link>
          {user.role === 'admin' && (
            <Link
              href="/admin"
              className={`text-sm transition-colors ${pathname.startsWith('/admin') ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <span className="text-gray-400 text-xs">{user.username}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  );
}
