'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Stat = {
  id: number;
  username: string;
  gegeven_actief: number;
  ontvangen_actief: number;
  gegeven_totaal: number;
  ontvangen_totaal: number;
};

export default function LeaderboardPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/anytimers/leaderboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-600 text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Klassement</h1>
          <p className="text-gray-500 text-sm">Totaaloverzicht anytimers</p>
        </div>
        <Link
          href="/dashboard"
          className="text-amber-600 hover:text-amber-700 text-sm font-medium"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-2">Naam</div>
          <div className="text-center">Op jou (actief)</div>
          <div className="text-center">Van jou (actief)</div>
          <div className="text-center">Totaal gedronken</div>
        </div>

        {stats.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400">Nog geen data</div>
        ) : (
          stats.map((s, i) => (
            <div
              key={s.id}
              className={`grid grid-cols-5 gap-2 px-4 py-4 border-b border-gray-50 last:border-0 hover:bg-amber-50 transition-colors ${i === 0 ? 'bg-amber-50' : ''}`}
            >
              <div className="col-span-2 flex items-center gap-2">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-orange-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {i + 1}
                </span>
                <span className="font-medium text-gray-900 text-sm">{s.username}</span>
              </div>
              <div className="flex items-center justify-center">
                <span className={`text-sm font-semibold ${s.ontvangen_actief > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {s.ontvangen_actief > 0 ? `🍺 ${s.ontvangen_actief}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <span className={`text-sm font-semibold ${s.gegeven_actief > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {s.gegeven_actief > 0 ? `✓ ${s.gegeven_actief}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-sm text-gray-600 font-medium">
                  {s.ontvangen_totaal > 0 ? s.ontvangen_totaal : '—'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { label: 'Meeste aktief op jou', value: stats[0]?.username ?? '—', sub: `${stats[0]?.ontvangen_actief ?? 0} actief` },
          { label: 'Totaal gedronken', value: stats.reduce((a, s) => a + s.ontvangen_totaal, 0).toString(), sub: 'door iedereen' },
          { label: 'Totaal actief', value: stats.reduce((a, s) => a + s.ontvangen_actief, 0).toString(), sub: 'openstaand' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-xl font-bold text-amber-600">{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
