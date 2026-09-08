'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AchievementBadge, getAchievementTier } from '@/components/AchievementBadge';

type Stat = {
  id: number;
  username: string;
  gegeven_actief: number;
  ontvangen_actief: number;
  gegeven_totaal: number;
  ontvangen_totaal: number;
  ontvangen_totaal_global: number;
  barf_totaal: number;
};

type Group = { id: string; name: string; slug: string };
type SessionUser = { id: number; username: string };

const TOP_N = 5;

function StatRow({ s, rank, highlight }: { s: Stat; rank: number; highlight?: boolean }) {
  const i = rank - 1;
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 last:border-0
        ${highlight ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0">
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
      <span className={`text-sm shrink-0 ${s.ontvangen_totaal > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-300 dark:text-gray-600'}`}>
        {s.ontvangen_totaal > 0 ? s.ontvangen_totaal : '—'}
      </span>
    </div>
  );
}

export default function LeaderboardPage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/auth/me').then(r => r.ok ? r.json() : null),
    ]).then(([data, session]) => {
      if (Array.isArray(data?.stats)) setStats(data.stats);
      if (Array.isArray(data?.groups)) setGroups(data.groups);
      if (session?.id) setMe(session);
      setLoading(false);
    });
  }, []);

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
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Klassement</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Iedereen die je kent, gecombineerd over al je groepen</p>
      </div>

      {/* Jouw groepen */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          <span className="text-xs text-gray-400 dark:text-gray-500">Jouw groepen:</span>
          {groups.map(g => (
            <Link
              key={g.id}
              href={`/org/${g.slug}`}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          <div>Naam</div>
          <div>Gedronken</div>
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
            {expanded ? `Minder tonen` : `Toon alle ${stats.length} personen`}
          </button>
        )}
      </div>

      {/* Totaalkaart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 mb-8">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Totaal gedronken</p>
        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {stats.reduce((a, s) => a + s.ontvangen_totaal, 0)}
        </p>
      </div>

      {/* Barf bokaal */}
      {(() => {
        const barfed = stats.filter(s => s.barf_totaal > 0).sort((a, b) => b.barf_totaal - a.barf_totaal);
        const topCounts = Array.from(new Set(barfed.map(s => s.barf_totaal))).slice(0, 3);
        if (topCounts.length === 0) return null;
        const podium = topCounts.map((count, i) => ({
          place: i + 1,
          count,
          users: barfed.filter(s => s.barf_totaal === count),
        }));
        const [winner, ...runnersUp] = podium;
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 mb-8">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">🏆 Barf bokaal</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {winner.users.map(u => u.username).join(' & ')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{winner.count}x gebarft</p>

            {runnersUp.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 space-y-1.5">
                {runnersUp.map(({ place, count, users }) => (
                  <div key={place} className="flex items-center gap-2.5">
                    <span className="w-4 text-[11px] font-medium text-gray-300 dark:text-gray-600 shrink-0">
                      {place}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
                      {users.map(u => u.username).join(' & ')}
                    </span>
                    <span className="text-[11px] text-gray-300 dark:text-gray-600 shrink-0">{count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
