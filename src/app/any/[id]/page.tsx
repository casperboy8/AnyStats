'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type AnytimerInfo = {
  id: number;
  reason: string;
  status: 'pending' | 'active' | 'inzetten_pending' | 'completed' | 'declined';
  confirmerRole: 'receiver' | 'giver';
  otherUserName: string;
  /** Aantal any's dat dit linkje in één keer afhandelt (bij meerdere any's tegelijk). */
  count: number;
};

export default function PublicAnytimerPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const preferredAction = searchParams.get('action'); // 'accept' | 'decline' — alleen om de knop te highlighten

  const [info, setInfo] = useState<AnytimerInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);
  const [result, setResult] = useState<'accepted' | 'declined' | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    const res = await fetch(`/api/public/anytimers/${id}?token=${encodeURIComponent(token)}`);
    if (!res.ok) { setNotFound(true); setLoading(false); return; }
    setInfo(await res.json());
    setLoading(false);
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  async function act(action: 'accept' | 'decline') {
    setError('');
    setActing(action);
    const res = await fetch(`/api/public/anytimers/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    setActing(null);
    if (!res.ok) { setError(data.error ?? 'Er ging iets mis'); return; }
    setResult(action === 'accept' ? 'accepted' : 'declined');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-600 text-lg">Laden...</div>
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-2xl mb-3">🔒</p>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Dit linkje is niet (meer) geldig</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Mogelijk is deze any al beantwoord op een ander apparaat, of klopt het linkje niet meer.
        </p>
        <Link href="/login" className="text-amber-600 hover:text-amber-500 text-sm font-medium">
          Inloggen op AnyStats →
        </Link>
      </div>
    );
  }

  const alreadyResolved = info.status !== 'pending';
  const isReceiver = info.confirmerRole === 'receiver';
  const countLabel = info.count > 1 ? `${info.count}x ` : '';

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
        <p className="text-3xl mb-3">🍺</p>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {isReceiver
            ? `${info.otherUserName} wil je ${countLabel}een anytimer geven`
            : `${info.otherUserName} zegt dat jij hem/haar ${countLabel}een anytimer hebt gegeven`}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm italic mb-6">&quot;{info.reason}&quot;</p>

        {result === 'accepted' ? (
          <p className="text-green-600 font-medium text-sm">✓ {isReceiver ? 'Geaccepteerd!' : 'Bevestigd!'}</p>
        ) : result === 'declined' ? (
          <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">{isReceiver ? 'Geweigerd.' : 'Afgewezen.'}</p>
        ) : alreadyResolved ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Deze any is al beantwoord — dat kan al op een ander apparaat zijn gedaan.</p>
        ) : (
          <>
            {!isReceiver && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Klopt dat?</p>
            )}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => act('decline')}
                disabled={acting !== null}
                className={`flex-1 border py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
                  ${preferredAction === 'decline' ? 'border-red-300 text-red-600 hover:bg-red-50' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                {acting === 'decline' ? 'Bezig…' : isReceiver ? (info.count > 1 ? '❌ Alles weigeren' : '❌ Weigeren') : (info.count > 1 ? '❌ Alles afwijzen' : '❌ Afwijzen')}
              </button>
              <button
                onClick={() => act('accept')}
                disabled={acting !== null}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {acting === 'accept' ? 'Bezig…' : isReceiver ? (info.count > 1 ? '✅ Alles accepteren' : '✅ Accepteren') : (info.count > 1 ? '✅ Alles bevestigen' : '✅ Bevestigen')}
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
        Heb je een account? <Link href="/login" className="text-amber-600 hover:text-amber-500">Log in</Link> voor het volledige overzicht.
      </p>
    </div>
  );
}
