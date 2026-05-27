'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

type Org = { id: string; name: string; slug: string; description: string | null; created_at: string };
type User = { id: number; username: string };

function toSlug(name: string) {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AdminOrganisationsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ name: '', slug: '', description: '', owner_id: '' });
  const [slugManual, setSlugManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [orgsRes, usersRes] = await Promise.all([
      fetch('/api/admin/organisations'),
      fetch('/api/admin/users'),
    ]);
    if (orgsRes.ok) setOrgs(await orgsRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleName(name: string) {
    setForm(f => ({ ...f, name, slug: slugManual ? f.slug : toSlug(name) }));
  }

  async function createOrg() {
    setError(''); setCreating(true);
    const res = await fetch('/api/admin/organisations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, owner_id: form.owner_id ? Number(form.owner_id) : undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setError(data.error); return; }
    setForm({ name: '', slug: '', description: '', owner_id: '' });
    setSlugManual(false);
    load();
  }

  async function deleteOrg(id: string, name: string) {
    if (!confirm(`Groep "${name}" verwijderen? Dit verwijdert ook alle leden en anytimers.`)) return;
    await fetch(`/api/admin/organisations/${id}`, { method: 'DELETE' });
    load();
  }

  if (loading) return <div className="p-8 text-center text-amber-600">Laden...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
        <Link href="/admin" className="hover:text-amber-600">Admin</Link>
        <span>/</span>
        <span>Groepen</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Groepen ({orgs.length})</h1>

      {/* Aanmaken */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Nieuwe groep aanmaken</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Naam *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleName(e.target.value)}
              placeholder="Bijv. Team Rood"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL) *</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
              <span className="px-2 py-2 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 shrink-0">/org/</span>
              <input
                type="text"
                value={form.slug}
                onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }}
                placeholder="team-rood"
                className="flex-1 px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Beschrijving</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optioneel..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Eigenaar (owner)</label>
            <select
              value={form.owner_id}
              onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            >
              <option value="">Kies een gebruiker...</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        <button
          onClick={createOrg}
          disabled={creating || !form.name.trim() || !form.slug.trim() || !form.owner_id}
          className="mt-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          {creating ? 'Aanmaken...' : '+ Groep aanmaken'}
        </button>
      </div>

      {/* Overzicht */}
      {orgs.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">
          Nog geen groepen aangemaakt.
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div>Naam</div>
            <div>Slug</div>
            <div className="text-right">Acties</div>
          </div>
          {orgs.map(org => (
            <div key={org.id} className="grid grid-cols-3 px-4 py-3 border-b border-gray-50 last:border-0 items-center">
              <div className="font-medium text-gray-900 text-sm">{org.name}</div>
              <div className="text-gray-400 text-sm font-mono">{org.slug}</div>
              <div className="flex justify-end gap-3">
                <Link href={`/org/${org.slug}/members`} className="text-xs text-amber-600 hover:text-amber-800 transition-colors">
                  Leden
                </Link>
                <button
                  onClick={() => deleteOrg(org.id, org.name)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Verwijder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
