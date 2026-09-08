'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { AchievementBadge, getAchievementTier, type AchievementTier } from '@/components/AchievementBadge';

type Anytimer = {
  id: number;
  giver_id: number;
  receiver_id: number;
  reason: string;
  status: string;
  created_at: string;
  giver_username: string;
  receiver_username: string;
  proof_url: string | null;
};

type Person = { id: number; username: string; ontvangen_totaal_global: number };
type SessionUser = { id: number; username: string; role: string };
type Pair = { giver_id: number; giver_username: string; receiver_id: number; receiver_username: string; count: number };

/** Voornaam voor smalle kolomkoppen in de matrix; volledige naam blijft in de title/rij te zien. */
function firstName(username: string) {
  return username.split(' ')[0];
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [anytimers, setAnytimers] = useState<Anytimer[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);

  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ receiver_id: '', reason: '' });
  const [newError, setNewError] = useState('');
  const [newLoading, setNewLoading] = useState(false);

  const [bevestigenModal, setBevestigenModal] = useState<Anytimer | null>(null);
  const [uploadModal, setUploadModal] = useState<Anytimer | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [barfModal, setBarfModal] = useState(false);
  const [barfUserId, setBarfUserId] = useState('');
  const [barfLoading, setBarfLoading] = useState(false);
  const [barfError, setBarfError] = useState('');

  const [matrixExpanded, setMatrixExpanded] = useState(false);

  const load = useCallback(async () => {
    const [meRes, anyRes, peopleRes, pairsRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/dashboard/anytimers'),
      fetch('/api/dashboard/people'),
      fetch('/api/dashboard/pairs'),
    ]);
    if (meRes.ok) setSession(await meRes.json());
    if (anyRes.ok) setAnytimers(await anyRes.json());
    if (peopleRes.ok) setPeople(await peopleRes.json());
    if (pairsRes.ok) setPairs(await pairsRes.json());
    setLoading(false);
  }, []);

  // Verwerk ?action=accept|decline|upload&id=X na laden (vanuit push/WhatsApp deep-links)
  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    if (!action || !id || loading) return;

    const anytimerId = Number(id);
    const anytimer = anytimers.find(a => a.id === anytimerId);
    if (!anytimer || !session) return;

    router.replace('/dashboard', { scroll: false });

    if (action === 'accept' && anytimer.receiver_id === session.id && anytimer.status === 'pending') {
      accept(anytimerId);
    } else if (action === 'decline' && anytimer.receiver_id === session.id && anytimer.status === 'pending') {
      decline(anytimerId);
    } else if (action === 'upload' && anytimer.receiver_id === session.id && anytimer.status === 'inzetten_pending') {
      setUploadModal(anytimer);
      setUploadFile(null);
      setUploadError('');
    }
  }, [loading, searchParams, anytimers, session]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/dashboard/anytimers').then(r => r.json()).then(d => { if (Array.isArray(d)) setAnytimers(d); });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  async function createAnytimer() {
    setNewError(''); setNewLoading(true);
    const res = await fetch('/api/dashboard/anytimers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: Number(newForm.receiver_id), reason: newForm.reason }),
    });
    const data = await res.json();
    setNewLoading(false);
    if (!res.ok) { setNewError(data.error); return; }
    setNewModal(false); setNewForm({ receiver_id: '', reason: '' }); load();
  }

  async function accept(id: number) { await fetch(`/api/anytimers/${id}/accept`, { method: 'POST' }); load(); }
  async function decline(id: number) { await fetch(`/api/anytimers/${id}/decline`, { method: 'POST' }); load(); }
  async function inzetten(id: number) { await fetch(`/api/anytimers/${id}/inzetten`, { method: 'POST' }); load(); }

  async function bevestigen(id: number, goed: boolean) {
    await fetch(`/api/anytimers/${id}/bevestigen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goed }),
    });
    setBevestigenModal(null); load();
  }

  async function logBarf() {
    if (!barfUserId) return;
    setBarfError(''); setBarfLoading(true);
    const res = await fetch('/api/dashboard/barf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: Number(barfUserId) }),
    });
    const data = await res.json();
    setBarfLoading(false);
    if (!res.ok) { setBarfError(data.error); return; }
    setBarfModal(false); setBarfUserId(''); load();
  }

  async function uploadBewijs(id: number) {
    if (!uploadFile) return;
    setUploadError(''); setUploadLoading(true);
    const form = new FormData();
    form.append('file', uploadFile);
    const res = await fetch(`/api/anytimers/${id}/upload`, { method: 'POST', body: form });
    const data = await res.json();
    setUploadLoading(false);
    if (!res.ok) { setUploadError(data.error); return; }
    setUploadModal(null); setUploadFile(null); load();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-amber-600 text-lg">Laden...</div>
    </div>
  );

  const myId = session?.id;
  const achievementMap = new Map<number, AchievementTier | null>(
    people.map(u => [u.id, getAchievementTier(u.ontvangen_totaal_global)])
  );
  const opMij = anytimers.filter(a => a.receiver_id === myId && a.status !== 'completed');
  const vanMij = anytimers.filter(a => a.giver_id === myId && a.status !== 'completed');
  const pendingOntvangen = opMij.filter(a => a.status === 'pending');
  const activeOpMij = opMij.filter(a => ['active', 'inzetten_pending'].includes(a.status));
  const pendingVerzonden = vanMij.filter(a => a.status === 'pending');
  const activeVanMij = vanMij.filter(a => ['active', 'inzetten_pending'].includes(a.status));

  // Matrix-personen: iedereen met wie je een groep deelt, plus jijzelf.
  const matrixPeople = session
    ? [{ id: session.id, username: session.username, ontvangen_totaal_global: 0 }, ...people].sort((a, b) => a.username.localeCompare(b.username))
    : [];
  const pairMap = new Map<string, number>(pairs.map(p => [`${p.giver_id}-${p.receiver_id}`, p.count]));
  const others = matrixPeople.filter(p => p.id !== myId);
  const maxPairCount = Math.max(1, ...pairs.map(p => p.count));
  function heatClass(count: number, isMine: boolean) {
    if (!count) return isMine ? 'bg-amber-500/[0.04] dark:bg-amber-400/[0.04]' : '';
    const ratio = count / maxPairCount;
    if (ratio > 0.66) return 'bg-amber-500/25 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 font-semibold';
    if (ratio > 0.33) return 'bg-amber-500/15 dark:bg-amber-400/[0.12] text-amber-600 dark:text-amber-400 font-medium';
    return 'bg-amber-500/[0.08] dark:bg-amber-400/[0.08] text-amber-600 dark:text-amber-400';
  }

  return (
    <>
    <div className="px-4 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto">
      <div className="mb-8 sm:mb-10 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-gray-900 border border-amber-100 dark:border-amber-900/30 px-5 py-5">
        <div>
          <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mb-0.5">Welkom terug</p>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{session?.username}</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setBarfModal(true)}
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            🤮 Barf
          </button>
          <button
            onClick={() => setNewModal(true)}
            className="bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            + Geven
          </button>
        </div>
      </div>

      <div className="space-y-10">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Op mij</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${opMij.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>{opMij.length}</span>
          </div>
          {pendingOntvangen.length === 0 && activeOpMij.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Leeg</p>
          ) : (
            <div className="space-y-2.5">
              {pendingOntvangen.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-medium ${achievementMap.get(a.giver_id)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{a.giver_username}</span>
                      <AchievementBadge tier={achievementMap.get(a.giver_id) ?? null} />
                      <span className="text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => accept(a.id)} className="text-xs font-medium px-2.5 py-1 bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 rounded transition-colors">Accepteer</button>
                      <button onClick={() => decline(a.id)} className="text-xs font-medium px-2.5 py-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded transition-colors">Weiger</button>
                    </div>
                  </div>
                </div>
              ))}
              {activeOpMij.map(a => (
                <div key={a.id} className={`bg-white dark:bg-gray-900 rounded-xl p-3.5 ${a.status === 'inzetten_pending' ? 'shadow-sm ring-1 ring-red-200 dark:ring-red-800/60' : 'shadow-sm ring-1 ring-gray-100 dark:ring-gray-800'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-medium ${achievementMap.get(a.giver_id)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{a.giver_username}</span>
                      <AchievementBadge tier={achievementMap.get(a.giver_id) ?? null} />
                      <span className="text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
                    </div>
                    {a.status === 'inzetten_pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-red-500">Drink nu</span>
                        <button
                          onClick={() => { setUploadModal(a); setUploadFile(null); setUploadError(''); }}
                          className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${a.proof_url ? 'border border-green-300 text-green-700 hover:bg-green-50' : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                          {a.proof_url ? 'Bewijs ✓' : 'Bewijs'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Van mij</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${vanMij.length > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>{vanMij.length}</span>
          </div>
          {pendingVerzonden.length === 0 && activeVanMij.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Leeg</p>
          ) : (
            <div className="space-y-2.5">
              {pendingVerzonden.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-900 ring-1 ring-gray-100 dark:ring-gray-800 rounded-xl p-3.5 opacity-50">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm font-medium ${achievementMap.get(a.receiver_id)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{a.receiver_username}</span>
                    <AchievementBadge tier={achievementMap.get(a.receiver_id) ?? null} />
                    <span className="text-gray-400 dark:text-gray-500">·</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">wacht op acceptatie</span>
                  </div>
                </div>
              ))}
              {activeVanMij.map(a => (
                <div key={a.id} className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-medium ${achievementMap.get(a.receiver_id)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{a.receiver_username}</span>
                      <AchievementBadge tier={achievementMap.get(a.receiver_id) ?? null} />
                      <span className="text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
                    </div>
                    <div className="shrink-0">
                      {a.status === 'active' && (
                        <button onClick={() => inzetten(a.id)} className="text-xs font-medium px-2.5 py-1 bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 rounded transition-colors">Inzetten</button>
                      )}
                      {a.status === 'inzetten_pending' && (
                        <button onClick={() => setBevestigenModal(a)} className="text-xs font-medium px-2.5 py-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded transition-colors">Bevestigen</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-800 my-8" />

      {/* Wie op wie — standaard een compact overzicht van jouw eigen stand, met
          de volledige groepsmatrix (spreadsheet) achter een uitklapper zodat
          hij niet de hele pagina domineert en prettig blijft op mobiel. */}
      <section>
        <div className="mb-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Wie op wie</h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Jouw openstaande stand met de groep</p>
        </div>

        {others.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Nog niemand om mee te vergelijken</p>
        ) : !matrixExpanded ? (
          <>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
              {others.map(p => {
                const given = pairMap.get(`${myId}-${p.id}`) ?? 0;
                const received = pairMap.get(`${p.id}-${myId}`) ?? 0;
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate min-w-0">{p.username}</span>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className={given ? 'text-amber-600 font-semibold' : 'text-gray-300 dark:text-gray-600'}>Jij → {given || '–'}</span>
                      <span className={received ? 'text-amber-600 font-semibold' : 'text-gray-300 dark:text-gray-600'}>→ Jij {received || '–'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setMatrixExpanded(true)}
              className="mt-2 w-full text-xs font-medium text-amber-600 hover:text-amber-500 border border-dashed border-amber-200 dark:border-amber-900/40 rounded-lg py-2 transition-colors"
            >
              Bekijk volledige matrix van de groep
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-end gap-1.5 mb-2">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Minder</span>
              <span className="w-3 h-3 rounded-sm bg-amber-500/[0.08] dark:bg-amber-400/[0.08]" />
              <span className="w-3 h-3 rounded-sm bg-amber-500/15 dark:bg-amber-400/[0.12]" />
              <span className="w-3 h-3 rounded-sm bg-amber-500/25 dark:bg-amber-400/20" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Meer</span>
            </div>
            <div className="max-w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm ring-1 ring-gray-100 dark:ring-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-gray-50/80 dark:bg-gray-800/60 backdrop-blur px-3 py-2.5 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-r border-gray-100 dark:border-gray-800 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span>↓ Gever</span>
                          <span>Ontvanger →</span>
                        </div>
                      </th>
                      {matrixPeople.map(c => (
                        <th
                          key={c.id}
                          title={c.username}
                          className={`px-2.5 py-2.5 text-center text-[11px] font-medium border-b border-gray-100 dark:border-gray-800 whitespace-nowrap ${
                            c.id === myId ? 'text-amber-600 font-semibold' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {c.id === myId ? 'Jij' : firstName(c.username)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixPeople.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <th
                          title={r.username}
                          className={`sticky left-0 z-10 bg-white dark:bg-gray-900 px-3 py-2.5 text-left text-xs font-medium border-r border-gray-100 dark:border-gray-800 whitespace-nowrap ${
                            r.id === myId ? 'text-amber-600 font-semibold' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {r.id === myId ? 'Jij' : r.username}
                        </th>
                        {matrixPeople.map(c => {
                          const isSelf = r.id === c.id;
                          const count = isSelf ? null : pairMap.get(`${r.id}-${c.id}`) ?? 0;
                          const isMine = r.id === myId || c.id === myId;
                          return (
                            <td
                              key={c.id}
                              className={`px-2.5 py-2.5 text-center transition-colors ${
                                isSelf ? 'bg-gray-50/80 dark:bg-gray-800/40' : heatClass(count ?? 0, isMine)
                              }`}
                            >
                              {!isSelf && count ? count : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <button
              onClick={() => setMatrixExpanded(false)}
              className="mt-2 w-full text-xs font-medium text-gray-400 hover:text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg py-2 transition-colors"
            >
              Verberg volledige matrix
            </button>
          </>
        )}
      </section>
      </div>
    </div>

      {/* Geven modal */}
      <Modal open={newModal} onClose={() => { setNewModal(false); setNewError(''); }} title="Anytimer geven">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Aan wie?</label>
            <select
              value={newForm.receiver_id}
              onChange={e => setNewForm(f => ({ ...f, receiver_id: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Kies een persoon...</option>
              {people.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Reden</label>
            <input
              type="text"
              value={newForm.reason}
              onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Bijv. gewonnen bij bier pong..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          {newError && <p className="text-red-500 text-sm">{newError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setNewModal(false); setNewError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
            <button onClick={createAnytimer} disabled={newLoading || !newForm.receiver_id || !newForm.reason} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {newLoading ? 'Bezig...' : 'Versturen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Barf modal */}
      <Modal open={barfModal} onClose={() => { setBarfModal(false); setBarfError(''); }} title="Barf registreren">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Wie heeft gebarft?</label>
            <select
              value={barfUserId}
              onChange={e => setBarfUserId(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Kies een persoon...</option>
              {myId && <option value={myId}>{session?.username} (jij)</option>}
              {people.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          {barfError && <p className="text-red-500 text-sm">{barfError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setBarfModal(false); setBarfError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
            <button onClick={logBarf} disabled={barfLoading || !barfUserId} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {barfLoading ? 'Bezig...' : 'Registreren'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bevestigen modal */}
      {bevestigenModal && (
        <Modal open={true} onClose={() => setBevestigenModal(null)} title="Bevestigen">
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Heeft <strong className="text-gray-900 dark:text-gray-100">{bevestigenModal.receiver_username}</strong> gedronken?</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">{bevestigenModal.reason}</p>
            {bevestigenModal.proof_url ? (
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {bevestigenModal.proof_url.match(/\.(mp4|mov|webm)$/) ? (
                  <video src={bevestigenModal.proof_url} controls className="w-full max-h-64 object-contain bg-black" />
                ) : (
                  <img src={bevestigenModal.proof_url} alt="Bewijs" className="w-full max-h-64 object-contain" />
                )}
              </div>
            ) : (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2.5">Geen bewijs geüpload.</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => bevestigen(bevestigenModal.id, false)} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Geweigerd</button>
              <button onClick={() => bevestigen(bevestigenModal.id, true)} className="flex-1 bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 font-medium py-2.5 rounded-lg text-sm transition-colors">Gedronken ✓</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <Modal open={true} onClose={() => { setUploadModal(null); setUploadFile(null); setUploadError(''); }} title="Bewijs uploaden">
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Upload een foto of filmpje als bewijs voor <strong className="text-gray-900 dark:text-gray-100">{uploadModal.reason}</strong>.</p>
            {uploadModal.proof_url && (
              <div className="rounded-lg overflow-hidden border border-green-200">
                {uploadModal.proof_url.match(/\.(mp4|mov|webm)$/) ? (
                  <video src={uploadModal.proof_url} controls className="w-full max-h-48 object-contain bg-black" />
                ) : (
                  <img src={uploadModal.proof_url} alt="Huidig bewijs" className="w-full max-h-48 object-contain" />
                )}
                <p className="text-xs text-green-600 px-3 py-1.5 bg-green-50 dark:bg-green-900/20">Huidig bewijs — je kunt het vervangen</p>
              </div>
            )}
            <label className="block">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Bestand kiezen</span>
              <input type="file" accept="image/*,video/*" onChange={e => setUploadFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-800 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-700" />
            </label>
            {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setUploadModal(null); setUploadFile(null); setUploadError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
              <button onClick={() => uploadBewijs(uploadModal.id)} disabled={uploadLoading || !uploadFile} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                {uploadLoading ? 'Uploaden...' : 'Uploaden'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
