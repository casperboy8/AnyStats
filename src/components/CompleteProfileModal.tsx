'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompleteProfileModal() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Opslaan mislukt');
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Nog even dit</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Vul je voor- en achternaam in zodat anderen je herkennen in plaats van je gebruikersnaam.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Voornaam</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              autoFocus
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Achternaam</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gray-900 dark:bg-white hover:bg-gray-700 disabled:opacity-50 text-white dark:text-gray-900 font-medium py-2.5 rounded-lg transition-colors text-sm"
          >
            {saving ? 'Bezig...' : 'Opslaan'}
          </button>
        </form>
      </div>
    </div>
  );
}
