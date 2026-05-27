'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', phone_number: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Registratie mislukt');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900">Account aanmaken</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-7">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Gebruikersnaam</label>
              <input
                type="text"
                value={form.username}
                onChange={e => update('username', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="jouwNaam"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="jou@email.nl"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Wachtwoord</label>
              <input
                type="password"
                value={form.password}
                onChange={e => update('password', e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Minimaal 6 tekens"
              />
            </div>

            {/* Telefoonnummer — optioneel */}
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Telefoonnummer <span className="text-gray-400">(optioneel)</span>
              </label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={e => update('phone_number', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="+31612345678"
              />
              <p className="text-xs text-gray-400 mt-1">
                Voor WhatsApp-notificaties. Gebruik internationaal formaat, bijv.{' '}
                <span className="font-mono">+31612345678</span>.
              </p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
            >
              {loading ? 'Bezig...' : 'Account aanmaken'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          Al een account?{' '}
          <Link href="/login" className="text-gray-700 hover:text-gray-900 font-medium">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
