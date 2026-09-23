'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  /** Wie 'm moet bevestigen — de partij die 'm niet zelf heeft aangemaakt. */
  confirmer_id: number;
};

type User = { id: number; username: string; ontvangen_totaal_global: number };
type SessionUser = { id: number; username: string; role: string };
type AnytimerGroup = { personId: number; personName: string; items: Anytimer[] };

/** Groepeert een lijst any's per tegenpartij, zodat je per persoon één rij ziet i.p.v. één rij per any. */
const STATUS_PRIORITY = ['pending', 'inzetten_pending', 'active'];
function groupByPerson(items: Anytimer[], personIdOf: (a: Anytimer) => number, personNameOf: (a: Anytimer) => string): AnytimerGroup[] {
  const map = new Map<number, AnytimerGroup>();
  for (const a of items) {
    const id = personIdOf(a);
    let g = map.get(id);
    if (!g) { g = { personId: id, personName: personNameOf(a), items: [] }; map.set(id, g); }
    g.items.push(a);
  }
  for (const g of map.values()) {
    g.items.sort((a, b) => STATUS_PRIORITY.indexOf(a.status) - STATUS_PRIORITY.indexOf(b.status));
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length);
}

export default function OrgDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [anytimers, setAnytimers] = useState<Anytimer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ counterpart_id: '', reason: '', direction: 'given' as 'given' | 'received', count: 1 });
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

  const [expandedGivers, setExpandedGivers] = useState<Set<number>>(new Set());
  const [expandedReceivers, setExpandedReceivers] = useState<Set<number>>(new Set());

  function toggleGiver(id: number) {
    setExpandedGivers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleReceiver(id: number) {
    setExpandedReceivers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const load = useCallback(async () => {
    const [meRes, anyRes, usersRes, orgRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch(`/api/org/${slug}/anytimers`),
      fetch(`/api/org/${slug}/users`),
      fetch(`/api/organisations/${slug}`),
    ]);
    if (meRes.ok) setSession(await meRes.json());
    if (anyRes.ok) setAnytimers(await anyRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    if (orgRes.ok) setIsOwner((await orgRes.json()).role === 'owner');
    setLoading(false);
  }, [slug]);

  // Verwerk ?action=accept|decline|upload&id=X na laden
  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    if (!action || !id || loading) return;

    const anytimerId = Number(id);
    const anytimer = anytimers.find(a => a.id === anytimerId);
    if (!anytimer || !session) return;

    // Verwijder query params uit URL zodat refresh niet opnieuw triggert
    router.replace(`/org/${slug}`, { scroll: false });

    if (action === 'accept' && anytimer.confirmer_id === session.id && anytimer.status === 'pending') {
      accept(anytimerId);
    } else if (action === 'decline' && anytimer.confirmer_id === session.id && anytimer.status === 'pending') {
      decline(anytimerId);
    } else if (action === 'upload' && anytimer.receiver_id === session.id && anytimer.status === 'inzetten_pending') {
      setUploadModal(anytimer);
      setUploadFile(null);
      setUploadError('');
    }
  }, [loading, searchParams, anytimers, session, slug]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/org/${slug}/anytimers`).then(r => r.json()).then(d => { if (Array.isArray(d)) setAnytimers(d); });
    }, 20000);
    return () => clearInterval(interval);
  }, [slug]);

  function openNewModal(direction: 'given' | 'received') {
    setNewForm({ counterpart_id: '', reason: '', direction, count: 1 });
    setNewError('');
    setNewModal(true);
  }

  async function createAnytimer() {
    setNewError(''); setNewLoading(true);
    const res = await fetch(`/api/org/${slug}/anytimers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ counterpart_id: Number(newForm.counterpart_id), reason: newForm.reason, direction: newForm.direction, count: newForm.count }),
    });
    const data = await res.json();
    setNewLoading(false);
    if (!res.ok) { setNewError(data.error); return; }
    setNewModal(false); load();
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
    const res = await fetch(`/api/org/${slug}/barf`, {
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
    users.map(u => [u.id, getAchievementTier(u.ontvangen_totaal_global)])
  );
  const opMij = anytimers.filter(a => a.receiver_id === myId && a.status !== 'completed' && a.status !== 'declined');
  const vanMij = anytimers.filter(a => a.giver_id === myId && a.status !== 'completed' && a.status !== 'declined');
  const opMijGroups = groupByPerson(opMij, a => a.giver_id, a => a.giver_username);
  const vanMijGroups = groupByPerson(vanMij, a => a.receiver_id, a => a.receiver_username);
  const othersInOrg = users.filter(u => u.id !== myId);

  function renderOpMijItem(a: Anytimer) {
    if (a.status === 'pending') {
      return (
        <div key={a.id} className={`p-3 ${a.confirmer_id === myId ? '' : 'opacity-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
              {a.confirmer_id !== myId && <span className="text-xs text-gray-400 dark:text-gray-500">wacht op bevestiging</span>}
            </div>
            {a.confirmer_id === myId && (
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => accept(a.id)} className="text-xs font-medium px-2.5 py-1 bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 rounded transition-colors">Accepteer</button>
                <button onClick={() => decline(a.id)} className="text-xs font-medium px-2.5 py-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded transition-colors">Weiger</button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div key={a.id} className="p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-gray-500 dark:text-gray-400 truncate">{a.reason}</span>
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
    );
  }

  function renderVanMijItem(a: Anytimer) {
    if (a.status === 'pending') {
      return (
        <div key={a.id} className={`p-3 ${a.confirmer_id === myId ? '' : 'opacity-50'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
              <span className="text-sm text-gray-500 dark:text-gray-400">{a.reason}</span>
              {a.confirmer_id !== myId && <span className="text-xs text-gray-400 dark:text-gray-500">wacht op acceptatie</span>}
            </div>
            {a.confirmer_id === myId && (
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => accept(a.id)} className="text-xs font-medium px-2.5 py-1 bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 rounded transition-colors">Bevestigen</button>
                <button onClick={() => decline(a.id)} className="text-xs font-medium px-2.5 py-1 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 rounded transition-colors">Afwijzen</button>
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div key={a.id} className="p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="min-w-0 text-sm text-gray-500 dark:text-gray-400 truncate">{a.reason}</span>
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
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{session?.username}</h1>
        <div className="flex gap-2">
          {isOwner && (
            <Link
              href={`/org/${slug}/settings`}
              title="Groepsinstellingen"
              className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm flex items-center"
            >
              ⚙️
            </Link>
          )}
          <button
            onClick={() => setBarfModal(true)}
            className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            🤮 Barf
          </button>
          <button
            onClick={() => openNewModal('received')}
            className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            🍺 Ik drink
          </button>
          <button
            onClick={() => openNewModal('given')}
            className="bg-gray-900 dark:bg-white hover:bg-gray-700 text-white dark:text-gray-900 font-medium px-3 py-1.5 rounded-lg transition-colors text-sm"
          >
            🍺 Iemand drinkt
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Op mij</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{opMij.length}</span>
          </div>
          {opMijGroups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Leeg</p>
          ) : (
            <div className="space-y-2">
              {opMijGroups.map(g => {
                const isOpen = expandedGivers.has(g.personId);
                const needsAction = g.items.some(a => a.status === 'pending' && a.confirmer_id === myId)
                  || g.items.some(a => a.status === 'inzetten_pending');
                return (
                  <div key={g.personId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGiver(g.personId)}
                      className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-medium ${achievementMap.get(g.personId)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{g.personName}</span>
                        <AchievementBadge tier={achievementMap.get(g.personId) ?? null} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {needsAction && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{g.items.length}x</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                        {g.items.map(renderOpMijItem)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="border-t border-gray-100 dark:border-gray-800" />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100">Van mij</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">{vanMij.length}</span>
          </div>
          {vanMijGroups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Leeg</p>
          ) : (
            <div className="space-y-2">
              {vanMijGroups.map(g => {
                const isOpen = expandedReceivers.has(g.personId);
                const needsAction = g.items.some(a => a.status === 'pending' && a.confirmer_id === myId);
                return (
                  <div key={g.personId} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleReceiver(g.personId)}
                      className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-medium ${achievementMap.get(g.personId)?.nameClasses ?? 'text-gray-900 dark:text-gray-100'}`}>{g.personName}</span>
                        <AchievementBadge tier={achievementMap.get(g.personId) ?? null} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {needsAction && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{g.items.length}x</span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                        {g.items.map(renderVanMijItem)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Geven/ontvangen modal — maakt niet uit wie van de twee 'm intypt, de ander bevestigt 'm */}
      <Modal open={newModal} onClose={() => { setNewModal(false); setNewError(''); }} title={newForm.direction === 'given' ? 'Iemand moet drinken' : 'Ik moet drinken'}>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
            {newForm.direction === 'given'
              ? 'Jij zegt dat iemand anders moet drinken. Die persoon krijgt een melding en moet dit zelf bevestigen.'
              : 'Jij zegt dat jij van iemand moet drinken. Die persoon krijgt een melding en moet dit zelf bevestigen.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {newForm.direction === 'given' ? 'Wie moet er drinken?' : 'Van wie kreeg je \'m?'}
            </label>
            <select
              value={newForm.counterpart_id}
              onChange={e => setNewForm(f => ({ ...f, counterpart_id: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Kies een persoon...</option>
              {othersInOrg.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Waarom?</label>
            <input
              type="text"
              value={newForm.reason}
              onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Bijv. gewonnen bij bier pong..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hoe vaak?</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNewForm(f => ({ ...f, count: Math.max(1, f.count - 1) }))}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-lg font-medium transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">{newForm.count}</span>
              <button
                type="button"
                onClick={() => setNewForm(f => ({ ...f, count: Math.min(20, f.count + 1) }))}
                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-lg font-medium transition-colors"
              >
                +
              </button>
              {newForm.count > 1 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">{newForm.count}x dezelfde reden</span>
              )}
            </div>
          </div>
          {newError && <p className="text-red-500 text-sm">{newError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setNewModal(false); setNewError(''); }} className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 py-2.5 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Annuleren</button>
            <button onClick={createAnytimer} disabled={newLoading || !newForm.counterpart_id || !newForm.reason} className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
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
              {users.map(u => <option key={u.id} value={u.id}>{u.id === myId ? `${u.username} (jij)` : u.username}</option>)}
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
    </div>
  );
}
