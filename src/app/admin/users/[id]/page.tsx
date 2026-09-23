'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type UserDetail = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  whatsapp_notifications: number;
  role: string;
  created_at: string;
};

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '', phone_number: '', role: 'user', whatsapp_notifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<{ link: string; channels: string[] } | null>(null);
  const [resetError, setResetError] = useState('');

  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users/${id}`).then(async r => {
      if (!r.ok) { setNotFound(true); setLoading(false); return; }
      const data: UserDetail = await r.json();
      setUser(data);
      setForm({
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        email: data.email,
        phone_number: data.phone_number ?? '',
        role: data.role,
        whatsapp_notifications: data.whatsapp_notifications === 1,
      });
      setLoading(false);
    });
  }, [id]);

  async function save() {
    setError(''); setSaved(false); setSaving(true);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: form.first_name,
        last_name: form.last_name,
        username: form.username,
        email: form.email,
        phone_number: form.phone_number,
        role: form.role,
        whatsapp_notifications: form.whatsapp_notifications,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function resetPassword() {
    setResetError(''); setResetResult(null); setResetLoading(true);
    const res = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    setResetLoading(false);
    if (!res.ok) { setResetError(data.error); return; }
    setResetResult(data);
  }

  async function deleteUser() {
    if (!user) return;
    if (!confirm(`Gebruiker "${user.username}" verwijderen? Dit verwijdert ook alle anytimers.`)) return;
    setDeleteError('');
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { setDeleteError(data.error); return; }
    router.push('/admin/users');
  }

  if (loading) return <div className="p-8 text-center text-amber-600">Laden...</div>;

  if (notFound || !user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Gebruiker niet gevonden.</p>
        <Link href="/admin/users" className="text-amber-600 hover:text-amber-500 text-sm font-medium">← Terug naar gebruikers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
        <Link href="/admin" className="hover:text-amber-600">Admin</Link>
        <span>/</span>
        <Link href="/admin/users" className="hover:text-amber-600">Gebruikers</Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-300">{user.username}</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">{user.first_name ? `${user.first_name} ${user.last_name}` : user.username}</h1>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Voornaam</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Achternaam</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gebruikersnaam</label>
          <input
            type="text"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefoonnummer</label>
          <input
            type="text"
            value={form.phone_number}
            onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
            placeholder="+31612345678"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.whatsapp_notifications}
            onChange={e => setForm(f => ({ ...f, whatsapp_notifications: e.target.checked }))}
            className="rounded border-gray-300 dark:border-gray-600 text-amber-600 focus:ring-amber-500"
          />
          WhatsApp-notificaties aan
        </label>

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
        {saved && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 text-sm px-3 py-2 rounded-lg">Opgeslagen ✓</div>}

        <div className="flex gap-3 pt-2">
          <Link href="/admin/users" className="flex-1 text-center border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Terug
          </Link>
          <button onClick={save} disabled={saving} className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors">
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mt-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Wachtwoord resetten</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Stuurt een reset-link naar deze gebruiker via WhatsApp en/of e-mail (30 minuten geldig).</p>
        <button
          onClick={resetPassword}
          disabled={resetLoading}
          className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          {resetLoading ? 'Bezig...' : '🔑 Reset-link versturen'}
        </button>
        {resetError && <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm px-3 py-2 rounded-lg">{resetError}</div>}
        {resetResult && (
          <div className="mt-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 text-sm px-3 py-2 rounded-lg space-y-1">
            <p>
              {resetResult.channels.length > 0
                ? `Verstuurd via ${resetResult.channels.join(' en ')}.`
                : 'Kon niet automatisch versturen (geen WhatsApp/e-mail beschikbaar) — deel de link zelf:'}
            </p>
            <p className="break-all text-xs font-mono bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded px-2 py-1">{resetResult.link}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 mt-4">
        <h2 className="text-sm font-semibold text-red-600 mb-1">Gevarenzone</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Verwijdert de gebruiker en alle bijbehorende anytimers. Dit kan niet ongedaan gemaakt worden.</p>
        {deleteError && <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 text-sm px-3 py-2 rounded-lg">{deleteError}</div>}
        <button onClick={deleteUser} className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
          Gebruiker verwijderen
        </button>
      </div>
    </div>
  );
}
