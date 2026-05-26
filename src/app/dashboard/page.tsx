'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/Modal';
import { usePushNotifications } from '@/hooks/usePush';

type Anytimer = {
  id: number;
  giver_id: number;
  receiver_id: number;
  reason: string;
  status: string;
  created_at: string;
  activated_at: string | null;
  giver_username: string;
  receiver_username: string;
};

type User = { id: number; username: string };

type SessionUser = { id: number; username: string; role: string };

export default function DashboardPage() {
  usePushNotifications();

  const [session, setSession] = useState<SessionUser | null>(null);
  const [anytimers, setAnytimers] = useState<Anytimer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ receiver_id: '', reason: '' });
  const [newError, setNewError] = useState('');
  const [newLoading, setNewLoading] = useState(false);

  const [bevestigenModal, setBevestigenModal] = useState<Anytimer | null>(null);

  const load = useCallback(async () => {
    const [meRes, anyRes, usersRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/anytimers'),
      fetch('/api/users'),
    ]);
    if (meRes.ok) setSession(await meRes.json());
    if (anyRes.ok) setAnytimers(await anyRes.json());
    if (usersRes.ok) setUsers(await usersRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll for updates every 20s
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/anytimers').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setAnytimers(data);
      });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  async function createAnytimer() {
    setNewError('');
    setNewLoading(true);
    const res = await fetch('/api/anytimers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: Number(newForm.receiver_id), reason: newForm.reason }),
    });
    const data = await res.json();
    setNewLoading(false);
    if (!res.ok) { setNewError(data.error); return; }
    setNewModal(false);
    setNewForm({ receiver_id: '', reason: '' });
    load();
  }

  async function accept(id: number) {
    await fetch(`/api/anytimers/${id}/accept`, { method: 'POST' });
    load();
  }

  async function decline(id: number) {
    await fetch(`/api/anytimers/${id}/decline`, { method: 'POST' });
    load();
  }

  async function inzetten(id: number) {
    await fetch(`/api/anytimers/${id}/inzetten`, { method: 'POST' });
    load();
  }

  async function bevestigen(id: number, goed: boolean) {
    await fetch(`/api/anytimers/${id}/bevestigen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goed }),
    });
    setBevestigenModal(null);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-600 text-lg">Laden...</div>
      </div>
    );
  }

  const myId = session?.id;

  const opMij = anytimers.filter(a => a.receiver_id === myId && a.status !== 'completed');
  const vanMij = anytimers.filter(a => a.giver_id === myId && a.status !== 'completed');

  const pendingOntvangen = opMij.filter(a => a.status === 'pending');
  const activeOpMij = opMij.filter(a => ['active', 'inzetten_pending'].includes(a.status));

  const pendingVerzonden = vanMij.filter(a => a.status === 'pending');
  const activeVanMij = vanMij.filter(a => ['active', 'inzetten_pending'].includes(a.status));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Hé {session?.username}! 🍺</p>
        </div>
        <button
          onClick={() => setNewModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
        >
          + Anytimer geven
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Anytimers op mij */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span>
            Op mij ({opMij.length})
          </h2>

          {pendingOntvangen.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">Verzoeken</p>
              <div className="space-y-3">
                {pendingOntvangen.map(a => (
                  <div key={a.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{a.giver_username}</p>
                        <p className="text-gray-600 text-sm mt-0.5">{a.reason}</p>
                        <p className="text-gray-400 text-xs mt-1">{new Date(a.created_at).toLocaleString('nl-NL')}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => accept(a.id)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Accepteer
                        </button>
                        <button
                          onClick={() => decline(a.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Weiger
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeOpMij.length > 0 ? (
            <div className="space-y-3">
              {activeOpMij.map(a => (
                <div
                  key={a.id}
                  className={`rounded-xl p-4 border ${a.status === 'inzetten_pending'
                    ? 'bg-red-50 border-red-300 animate-pulse'
                    : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{a.giver_username}</p>
                      <p className="text-gray-600 text-sm mt-0.5">{a.reason}</p>
                      <p className="text-gray-400 text-xs mt-1">{new Date(a.created_at).toLocaleString('nl-NL')}</p>
                    </div>
                    {a.status === 'inzetten_pending' && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shrink-0">
                        🍺 DRINK!
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : pendingOntvangen.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
              Geen actieve anytimers op jou 🎉
            </div>
          ) : null}
        </section>

        {/* Anytimers van mij */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            Van mij ({vanMij.length})
          </h2>

          {pendingVerzonden.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">In afwachting</p>
              <div className="space-y-3">
                {pendingVerzonden.map(a => (
                  <div key={a.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 text-sm">{a.receiver_username}</p>
                    <p className="text-gray-600 text-sm mt-0.5">{a.reason}</p>
                    <p className="text-amber-600 text-xs mt-1">Wacht op acceptatie...</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeVanMij.length > 0 ? (
            <div className="space-y-3">
              {activeVanMij.map(a => (
                <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{a.receiver_username}</p>
                      <p className="text-gray-600 text-sm mt-0.5">{a.reason}</p>
                      <p className="text-gray-400 text-xs mt-1">{new Date(a.created_at).toLocaleString('nl-NL')}</p>
                    </div>
                    <div className="shrink-0">
                      {a.status === 'active' && (
                        <button
                          onClick={() => inzetten(a.id)}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          🍺 Inzetten
                        </button>
                      )}
                      {a.status === 'inzetten_pending' && (
                        <button
                          onClick={() => setBevestigenModal(a)}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Bevestigen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : pendingVerzonden.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
              Geen actieve anytimers van jou
            </div>
          ) : null}
        </section>
      </div>

      {/* Modal: nieuwe anytimer */}
      <Modal open={newModal} onClose={() => { setNewModal(false); setNewError(''); }} title="Anytimer geven">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aan wie?</label>
            <select
              value={newForm.receiver_id}
              onChange={e => setNewForm(f => ({ ...f, receiver_id: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Kies een persoon...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reden</label>
            <input
              type="text"
              value={newForm.reason}
              onChange={e => setNewForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Bijv. gewonnen bij bier pong..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {newError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {newError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setNewModal(false); setNewError(''); }}
              className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={createAnytimer}
              disabled={newLoading || !newForm.receiver_id || !newForm.reason}
              className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {newLoading ? 'Bezig...' : 'Versturen'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: bevestigen */}
      {bevestigenModal && (
        <Modal open={true} onClose={() => setBevestigenModal(null)} title="Anytimer bevestigen">
          <div className="space-y-4">
            <p className="text-gray-700 text-sm">
              Heeft <strong>{bevestigenModal.receiver_username}</strong> de anytimer ingezet?
            </p>
            <p className="text-gray-500 text-xs bg-gray-50 rounded-lg px-3 py-2">
              {bevestigenModal.reason}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => bevestigen(bevestigenModal.id, false)}
                className="flex-1 border border-red-200 text-red-700 font-medium py-2 rounded-lg text-sm hover:bg-red-50 transition-colors"
              >
                ❌ Geweigerd
              </button>
              <button
                onClick={() => bevestigen(bevestigenModal.id, true)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                ✅ Gedronken!
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
