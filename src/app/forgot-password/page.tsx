'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Er ging iets mis');
      return;
    }
    setMessage(data.message ?? 'Als dit account bestaat, ontvang je zo een reset-link.');
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8] dark:bg-[#111113] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Wachtwoord vergeten</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-7">
          {message ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">{message}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen via WhatsApp
                (als je een telefoonnummer hebt ingesteld) en/of e-mail.
              </p>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="jou@email.nl"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 dark:bg-white hover:bg-gray-700 disabled:opacity-50 text-white dark:text-gray-900 font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
              >
                {loading ? 'Bezig...' : 'Verstuur reset-link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-5">
          <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 font-medium">
            ← Terug naar inloggen
          </Link>
        </p>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
          <Link href="/forgot-username" className="hover:text-gray-700 dark:hover:text-gray-300">
            E-mailadres ook vergeten?
          </Link>
        </p>
      </div>
    </div>
  );
}
