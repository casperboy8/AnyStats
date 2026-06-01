'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type InviteInfo = { org_name: string; org_slug: string; role: string; code: string };
type Session = { id: number; username: string };

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/invite/${code}`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([inviteData, me]) => {
      if (inviteData.error) setError(inviteData.error);
      else setInvite(inviteData);
      setSession(me);
      setLoading(false);
    });
  }, [code]);

  async function join() {
    setJoining(true);
    const res = await fetch(`/api/invite/${code}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setJoining(false); return; }
    router.push(`/org/${data.slug}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center">
        <div className="text-amber-600">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          {error ? (
            <>
              <h1 className="text-base font-semibold text-gray-900 mb-2">Ongeldige koppelcode</h1>
              <p className="text-sm text-gray-500">{error}</p>
              <Link href="/dashboard" className="mt-5 inline-block text-sm text-amber-600 hover:underline">
                Naar dashboard
              </Link>
            </>
          ) : invite ? (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Uitnodiging</p>
              <h1 className="text-lg font-bold text-gray-900 mb-1">{invite.org_name}</h1>
              <p className="text-sm text-gray-500 mb-6">
                Rol: <span className="font-medium text-gray-700">
                  {invite.role === 'admin' ? 'Beheerder' : 'Lid'}
                </span>
              </p>

              {session ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Ingelogd als <span className="font-medium text-gray-900">{session.username}</span>
                  </p>
                  <button
                    onClick={join}
                    disabled={joining}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    {joining ? 'Bezig...' : `Deelnemen aan ${invite.org_name}`}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Log in of maak een account aan om deel te nemen.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/register?invite=${code}`}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors text-center"
                    >
                      Account aanmaken
                    </Link>
                    <Link
                      href={`/login?invite=${code}`}
                      className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors text-center"
                    >
                      Inloggen
                    </Link>
                  </div>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
