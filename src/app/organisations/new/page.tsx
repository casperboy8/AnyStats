'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NewOrganisationPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [slugManual, setSlugManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleName(name: string) {
    setForm(f => ({ ...f, name, slug: slugManual ? f.slug : toSlug(name) }));
  }

  async function submit() {
    setError('');
    setLoading(true);
    const res = await fetch('/api/organisations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/org/${data.slug}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Nieuwe groep</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Naam</label>
          <input
            type="text"
            value={form.name}
            onChange={e => handleName(e.target.value)}
            placeholder="Bijv. Team Rood"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slug (URL)</label>
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-400">
            <span className="px-3 py-2.5 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shrink-0">/org/</span>
            <input
              type="text"
              value={form.slug}
              onChange={e => { setSlugManual(true); setForm(f => ({ ...f, slug: e.target.value })); }}
              placeholder="team-rood"
              className="flex-1 px-3 py-2.5 text-sm focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Alleen kleine letters, cijfers en koppeltekens.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Beschrijving <span className="text-gray-400 dark:text-gray-500 font-normal">(optioneel)</span></label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Korte omschrijving..."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => router.back()}
            className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={submit}
            disabled={loading || !form.name.trim() || !form.slug.trim()}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Aanmaken...' : 'Aanmaken'}
          </button>
        </div>
      </div>
    </div>
  );
}
