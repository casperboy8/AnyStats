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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-10">
        <h1 className="text-xl font-semibold text-gray-900">Klassement</h1>
        <p className="text-gray-400 text-sm mt-0.5">Totaaloverzicht</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
        <div className="grid grid-cols-4 px-4 py-3 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-widest">
          <div className="col-span-2">Naam</div>
          <div className="text-center">Actief op jou</div>
          <div className="text-center">Gedronken</div>
        </div>

        {stats.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 text-sm">Nog geen data</div>
        ) : stats.map((s, i) => (
          <div
            key={s.id}
            className="grid grid-cols-4 px-4 py-3.5 border-b border-gray-50 last:border-0 items-center"
          >
            <div className="col-span-2 flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0
                ${i === 0 ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'}`}>
                {i + 1}
              </span>
              <span className="font-medium text-gray-900 text-sm">{s.username}</span>
            </div>
            <div className="text-center">
              <span className={`text-sm font-medium ${s.ontvangen_actief > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                {s.ontvangen_actief > 0 ? s.ontvangen_actief : '—'}
              </span>
            </div>
            <div className="text-center">
              <span className={`text-sm ${s.ontvangen_totaal > 0 ? 'text-gray-700 font-medium' : 'text-gray-300'}`}>
                {s.ontvangen_totaal > 0 ? s.ontvangen_totaal : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Totaal gedronken</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.reduce((a, s) => a + s.ontvangen_totaal, 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Actief openstaand</p>
          <p className="text-2xl font-semibold text-amber-500">{stats.reduce((a, s) => a + s.ontvangen_actief, 0)}</p>
        </div>
      </div>
    </div>
  );
}
