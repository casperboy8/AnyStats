'use client';

import { useState, useEffect } from 'react';

type Profile = {
  id: number;
  username: string;
  email: string;
  phone_number: string | null;
  whatsapp_notifications: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState('');
  const [waEnabled, setWaEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setPhone(data.phone_number ?? '');
        setWaEnabled(data.whatsapp_notifications === 1);
        setLoading(false);
      });
  }, []);

  async function save() {
    setError(''); setSuccess(''); setSaving(true);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number: phone,
        whatsapp_notifications: waEnabled,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? 'Opslaan mislukt');
      return;
    }
    setSuccess('Opgeslagen ✓');
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-amber-600">Laden...</div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">Profiel</h1>

      {/* Accountinfo — alleen-lezen */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Gebruikersnaam</p>
          <p className="text-sm font-medium text-gray-900">{profile?.username}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Email</p>
          <p className="text-sm text-gray-700">{profile?.email}</p>
        </div>
      </div>

      {/* WhatsApp instellingen */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          📱 WhatsApp notificaties
        </h2>

        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Telefoonnummer
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+31612345678"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Gebruik internationaal formaat, bijv. <span className="font-mono">+31612345678</span> of <span className="font-mono">0612345678</span>.
            Laat leeg om geen WhatsApp te ontvangen.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">WhatsApp notificaties ontvangen</p>
            <p className="text-xs text-gray-400 mt-0.5">Ontvang berichten bij nieuwe anytimers en groep-uitnodigingen</p>
          </div>
          <button
            type="button"
            onClick={() => setWaEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
              waEnabled ? 'bg-amber-500' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={waEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                waEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </div>
  );
}
