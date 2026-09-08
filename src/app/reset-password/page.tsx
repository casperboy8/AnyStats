'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }
    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || 'Er ging iets mis');
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push('/login'), 2000);
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] dark:bg-[#111113] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Deze link is ongeldig. Vraag een nieuwe reset-link aan.
          </p>
          <Link href="/forgot-password" className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline">
            Wachtwoord vergeten
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8] dark:bg-[#111113] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Nieuw wachtwoord instellen</h1>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-7">
          {success ? (
            <p className="text-sm text-green-600">Wachtwoord gewijzigd ✓ Je wordt doorgestuurd naar inloggen...</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Nieuw wachtwoord</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1.5">Bevestig nieuw wachtwoord</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 dark:bg-white hover:bg-gray-700 disabled:opacity-50 text-white dark:text-gray-900 font-medium py-2.5 rounded-lg transition-colors text-sm mt-2"
              >
                {loading ? 'Bezig...' : 'Wachtwoord instellen'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
