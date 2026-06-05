'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';

type User = { id: number; username: string; email: string; role: string; created_at: string };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch('/api/admin/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createUser() {
    setError('');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNewModal(false);
    setForm({ username: '', email: '', password: '', role: 'user' });
    load();
  }

  async function changeRole(id: number, role: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function deleteUser(id: number, username: string) {
    if (!confirm(`Gebruiker "${username}" verwijderen? Dit verwijdert ook alle anytimers.`)) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
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
            <span>Gebruikers</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gebruikers ({users.length})</h1>
        </div>
        <button
          onClick={() => setNewModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Toevoegen
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <div>Naam</div>
          <div>Email</div>
          <div>Rol</div>
          <div className="text-right">Acties</div>
        </div>
        {users.map(u => (
          <div key={u.id} className="grid grid-cols-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center">
            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{u.username}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm truncate">{u.email}</div>
            <div>
              <select
                value={u.role}
                onChange={e => changeRole(u.id, e.target.value)}
                className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="user">Gebruiker</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => deleteUser(u.id, u.username)}
                className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
              >
                Verwijder
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={newModal} onClose={() => { setNewModal(false); setError(''); }} title="Gebruiker aanmaken">
        <div className="space-y-3">
          {['username', 'email', 'password'].map(field => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{field}</label>
              <input
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="user">Gebruiker</option>
              <option value="admin">Super Admin</option>
            </select>
          </div>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setNewModal(false); setError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
            <button onClick={createUser} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Aanmaken</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
