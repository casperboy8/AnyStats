'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type BarfEvent = {
  id: number;
  user_id: number;
  username: string;
  organisation_id: string;
  organisation_name: string;
  logged_by: number;
  logged_by_username: string;
  created_at: string;
};

type User = { id: number; username: string };

export default function AdminBarfPage() {
  const [events, setEvents] = useState<BarfEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    const [barfRes, usersRes] = await Promise.all([
      fetch('/api/admin/barf'),
      fetch('/api/admin/users'),
    ]);
    if (barfRes.ok) setEvents(await barfRes.json());
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(Array.isArray(data) ? data.map((u: { id: number; username: string }) => ({ id: u.id, username: u.username })) : []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateUser(id: number, userId: string) {
    setEditingId(null);
    await fetch(`/api/admin/barf/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(userId) }),
    });
    load();
  }

  async function deleteEvent(id: number) {
    if (!confirm('Deze barf-registratie verwijderen?')) return;
    await fetch(`/api/admin/barf/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <div className="p-8 text-center text-amber-600">Laden...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-amber-600">Admin</Link>
            <span>/</span>
            <span>Barf</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🤮 Barf-registraties ({events.length})</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
       <div className="overflow-x-auto">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-5 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <div>Gebruiker</div>
          <div>Groep</div>
          <div>Geregistreerd door</div>
          <div>Datum</div>
          <div className="text-right">Acties</div>
        </div>
        {events.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">Geen barf-registraties</div>
        ) : (
          events.map(e => (
            <div key={e.id} className="grid grid-cols-5 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center gap-2">
              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {editingId === e.id ? (
                  <select
                    autoFocus
                    defaultValue={e.user_id}
                    onChange={ev => updateUser(e.id, ev.target.value)}
                    onBlur={() => setEditingId(null)}
                    className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                ) : (
                  <button onClick={() => setEditingId(e.id)} className="hover:underline decoration-dotted" title="Klik om aan te passen">
                    {e.username}
                  </button>
                )}
              </div>
              <div className="text-gray-700 dark:text-gray-300 text-sm truncate">{e.organisation_name}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm truncate">{e.logged_by_username}</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">{new Date(e.created_at).toLocaleString('nl-NL')}</div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => deleteEvent(e.id)}
                  className="text-red-400 hover:text-red-600 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
        </div>
       </div>
      </div>
    </div>
  );
}
