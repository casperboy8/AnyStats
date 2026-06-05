'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AchievementBadge, getAchievementTier } from '@/components/AchievementBadge';

type Stat = {
  id: number;
  username: string;
  gegeven_actief: number;
  ontvangen_actief: number;
  gegeven_totaal: number;
  ontvangen_totaal: number;
  ontvangen_totaal_global: number;
};

export default function OrgLeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/org/${slug}/leaderboard`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setStats(data); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-600 text-lg">Laden...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Klassement</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Totaaloverzicht van deze groep</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
        {/* Header */}
        <div className="grid grid-cols-3 sm:grid-cols-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          <div className="col-span-2">Naam</div>
          <div className="hidden sm:block text-center">Actief</div>
          <div className="text-center">Gedronken</div>
        </div>

        {stats.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-400 dark:text-gray-500 text-sm">Nog geen data</div>
        ) : stats.map((s, i) => (
          <div
            key={s.id}
            className="grid grid-cols-3 sm:grid-cols-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center"
          >
            <div className="col-span-2 flex items-center gap-3 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0
                ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`font-medium text-sm truncate ${getAchievementTier(s.ontvangen_totaal_global)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>
                  {s.username}
                </span>
                <AchievementBadge tier={getAchievementTier(s.ontvangen_totaal_global)} />
              </div>
            </div>
            <div className="hidden sm:block text-center">
              <span className={`text-sm font-medium ${s.ontvangen_actief > 0 ? 'text-amber-600' : 'text-gray-300 dark:text-gray-600'}`}>
                {s.ontvangen_actief > 0 ? s.ontvangen_actief : '—'}
              </span>
            </div>
            <div className="text-center">
              <span className={`text-sm ${s.ontvangen_totaal > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-300 dark:text-gray-600'}`}>
                {s.ontvangen_totaal > 0 ? s.ontvangen_totaal : '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Totaalkaarten */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Totaal gedronken</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {stats.reduce((a, s) => a + s.ontvangen_totaal, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Actief openstaand</p>
          <p className="text-2xl font-semibold text-amber-500">
            {stats.reduce((a, s) => a + s.ontvangen_actief, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
