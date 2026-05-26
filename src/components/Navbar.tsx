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
    <nav className="bg-amber-700 shadow-lg">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-white font-bold text-lg tracking-tight">
            🍺 Anytimer
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors ${pathname === '/dashboard' ? 'text-white' : 'text-amber-200 hover:text-white'}`}
          >
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            className={`text-sm font-medium transition-colors ${pathname === '/leaderboard' ? 'text-white' : 'text-amber-200 hover:text-white'}`}
          >
            Klassement
          </Link>
          {user.role === 'admin' && (
            <Link
              href="/admin"
              className={`text-sm font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-white' : 'text-amber-200 hover:text-white'}`}
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="text-amber-200 text-sm">{user.username}</span>
          <button
            onClick={logout}
            className="text-xs text-amber-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-amber-600"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  );
}
