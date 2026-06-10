'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Stats = {
  users: number;
  active_anytimers: number;
  total_anytimers: number;
  completed_anytimers: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/anytimers').then(r => r.json()),
    ]).then(([users, anytimers]) => {
      const arr = Array.isArray(anytimers) ? anytimers : [];
      setStats({
        users: Array.isArray(users) ? users.length : 0,
        total_anytimers: arr.length,
        active_anytimers: arr.filter((a: { status: string }) => a.status === 'active').length,
        completed_anytimers: arr.filter((a: { status: string }) => a.status === 'completed').length,
      });
    });
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admin Dashboard</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Beheer gebruikers en anytimers</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Gebruikers', value: stats?.users ?? '…', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
          { label: 'Actief', value: stats?.active_anytimers ?? '…', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
          { label: 'Totaal', value: stats?.total_anytimers ?? '…', color: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' },
          { label: 'Voltooid', value: stats?.completed_anytimers ?? '…', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-4 text-center ${card.color}`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs font-medium mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/admin/users" className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Gebruikers</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Accounts, rollen, verwijderen</p>
        </Link>
        <Link href="/admin/anytimers" className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Anytimers</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Aanmaken, status, verwijderen</p>
        </Link>
        <Link href="/admin/organisations" className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Groepen</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Aanmaken, beheren, verwijderen</p>
        </Link>
        <Link href="/admin/whatsapp" className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">📱 WhatsApp</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Verbinding, QR-code, testbericht</p>
        </Link>
      </div>
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-600">v2026-06-10b</p>
    </div>
  );
}
