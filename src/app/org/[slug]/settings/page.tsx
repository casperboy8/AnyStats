'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function OrgSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch(`/api/organisations/${slug}`)
      .then(r => r.json())
      .then(data => {
        const owner = data.role === 'owner';
        setIsOwner(owner);
        // Niet-owners hebben hier niets te zoeken
        if (!owner) { router.replace(`/org/${slug}`); return; }
        setForm({ name: data.name || '', description: data.description || '' });
        setLoading(false);
      });
  }, [slug, router]);

  async function save() {
    setError(''); setSuccess(''); setSaveLoading(true);
    const res = await fetch(`/api/organisations/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaveLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setSuccess('Opgeslagen');
  }

  async function deleteOrg() {
    if (!confirm('Weet je het zeker? Dit verwijdert de groep en alle gekoppelde data.')) return;
    setDeleteLoading(true);
    await fetch(`/api/organisations/${slug}`, { method: 'DELETE' });
    router.push('/organisations');
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-amber-600">Laden...</div></div>;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/org/${slug}`} className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</Link>
        <h1 className="text-lg font-semibold text-gray-900">Instellingen</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Naam</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Beschrijving</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          onClick={save}
          disabled={saveLoading || !form.name.trim()}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {saveLoading ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>

      {isOwner && (
        <div className="mt-12 pt-6 border-t border-red-100">
          <h2 className="text-sm font-medium text-red-700 mb-2">Gevaarlijke zone</h2>
          <p className="text-xs text-gray-400 mb-4">Dit verwijdert de groep permanent. Er is geen weg terug.</p>
          <button
            onClick={deleteOrg}
            disabled={deleteLoading}
            className="w-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {deleteLoading ? 'Verwijderen...' : 'Groep verwijderen'}
          </button>
        </div>
      )}
    </div>
  );
}
