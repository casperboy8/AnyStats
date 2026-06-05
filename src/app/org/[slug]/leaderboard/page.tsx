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

type Pair = {
  giver_id: number;
  giver_username: string;
  receiver_id: number;
  receiver_username: string;
  count: number;
};

type SessionUser = {
  id: number;
  username: string;
};

const TOP_N = 5;

function StatRow({ s, rank, highlight }: { s: Stat; rank: number; highlight?: boolean }) {
  const i = rank - 1;
  return (
    <div
      className={`grid grid-cols-3 sm:grid-cols-4 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center
        ${highlight ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
    >
      <div className="col-span-2 flex items-center gap-3 min-w-0">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0
          ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'}`}>
          {rank}
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
  );
}

export default function OrgLeaderboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [stats, setStats] = useState<Stat[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/org/${slug}/leaderboard`).then(r => r.json()),
      fetch(`/api/org/${slug}/pairs`).then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([leaderboard, pairsData, session]) => {
      if (Array.isArray(leaderboard)) setStats(leaderboard);
      if (Array.isArray(pairsData)) setPairs(pairsData);
      if (session?.id) setMe(session);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-600 text-lg">Laden...</div>
      </div>
    );
  }

  const top5 = stats.slice(0, TOP_N);
  const myRank = me ? stats.findIndex(s => s.id === me.id) : -1;
  const myStat = myRank >= 0 ? stats[myRank] : null;
  const myIsInTop = myRank >= 0 && myRank < TOP_N;

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
        ) : expanded ? (
          stats.map((s, i) => (
            <StatRow key={s.id} s={s} rank={i + 1} highlight={s.id === me?.id} />
          ))
        ) : (
          <>
            {top5.map((s, i) => (
              <StatRow key={s.id} s={s} rank={i + 1} highlight={s.id === me?.id} />
            ))}

            {/* Eigen positie buiten top 5 */}
            {!myIsInTop && myStat && (
              <>
                <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-50 dark:border-gray-800">
                  <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 font-medium shrink-0">
                    {stats.length > TOP_N + 1 ? `${stats.length - TOP_N - 1} anderen` : ''}
                  </span>
                  <div className="flex-1 border-t border-dashed border-gray-200 dark:border-gray-700" />
                </div>
                <StatRow s={myStat} rank={myRank + 1} highlight />
              </>
            )}
          </>
        )}

        {/* Toon alles / Minder knop */}
        {stats.length > TOP_N && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full px-4 py-2.5 text-xs font-medium text-amber-600 hover:text-amber-500 border-t border-gray-100 dark:border-gray-800 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors"
          >
            {expanded ? `Minder tonen` : `Toon alle ${stats.length} leden`}
          </button>
        )}
      </div>

      {/* Totaalkaarten */}
      <div className="grid grid-cols-2 gap-3 mb-8">
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

      {/* Wie op wie */}
      {pairs.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Wie op wie</h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              <div>Gever</div>
              <div>Ontvanger</div>
              <div className="text-right">Openstaand</div>
            </div>
            {pairs.map((p, i) => (
              <div key={i} className="grid grid-cols-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 items-center">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.giver_username}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{p.receiver_username}</div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${p.count > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{p.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
