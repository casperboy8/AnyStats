'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';

type Anytimer = {
  id: number;
  giver_username: string;
  receiver_username: string;
  reason: string;
  status: string;
  created_at: string;
};

type User = { id: number; username: string };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Wacht op acceptatie',
  active: 'Actief',
  inzetten_pending: 'Ingezet',
  completed: 'Voltooid',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-100 text-orange-700',
  active: 'bg-green-100 text-green-700',
  inzetten_pending: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-500',
};

export default function AdminAnytimersPage() {
  const [anytimers, setAnytimers] = useState<Anytimer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);
  const [form, setForm] = useState({ giver_id: '', receiver_id: '', reason: '', status: 'active' });
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function load() {
    const [anyRes, usersRes] = await Promise.all([
      fetch('/api/admin/anytimers'),
      fetch('/api/admin/users'),
    ]);
    if (anyRes.ok) setAnytimers(await anyRes.json());
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(Array.isArray(data) ? data.map((u: { id: number; username: string }) => ({ id: u.id, username: u.username })) : []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createAnytimer() {
    setError('');
    const res = await fetch('/api/admin/anytimers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, giver_id: Number(form.giver_id), receiver_id: Number(form.receiver_id) }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNewModal(false);
    setForm({ giver_id: '', receiver_id: '', reason: '', status: 'active' });
    load();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/admin/anytimers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteAnytimer(id: number) {
    if (!confirm('Anytimer verwijderen?')) return;
    await fetch(`/api/admin/anytimers/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = anytimers.filter(a => filter === 'all' || a.status === filter);

  if (loading) return <div className="p-8 text-center text-amber-600">Laden...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/admin" className="hover:text-amber-600">Admin</Link>
            <span>/</span>
            <span>Anytimers</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Anytimers ({filtered.length})</h1>
        </div>
        <button
          onClick={() => setNewModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Aanmaken
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[['all', 'Alle'], ['active', 'Actief'], ['pending', 'Wachtend'], ['inzetten_pending', 'Ingezet'], ['completed', 'Voltooid']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === val ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-5 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          <div>Van</div>
          <div>Aan</div>
          <div className="col-span-2">Reden</div>
          <div className="text-right">Status / Acties</div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-gray-400 dark:text-gray-500">Geen anytimers</div>
        ) : (
          filtered.map(a => (
            <div key={a.id} className="grid grid-cols-5 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center gap-2">
              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{a.giver_username}</div>
              <div className="text-gray-700 dark:text-gray-300 text-sm">{a.receiver_username}</div>
              <div className="col-span-2 text-gray-500 dark:text-gray-400 text-sm truncate">{a.reason}</div>
              <div className="flex items-center justify-end gap-2">
                <select
                  value={a.status}
                  onChange={e => updateStatus(a.id, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg border-0 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 ${STATUS_COLORS[a.status] || ''}`}
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={() => deleteAnytimer(a.id)}
                  className="text-red-400 hover:text-red-600 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={newModal} onClose={() => { setNewModal(false); setError(''); }} title="Anytimer aanmaken">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Van (gever)</label>
            <select value={form.giver_id} onChange={e => setForm(f => ({ ...f, giver_id: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100">
              <option value="">Kies...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aan (ontvanger)</label>
            <select value={form.receiver_id} onChange={e => setForm(f => ({ ...f, receiver_id: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100">
              <option value="">Kies...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reden</label>
            <input type="text" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100">
              {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setNewModal(false); setError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
            <button onClick={createAnytimer} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors">Aanmaken</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
