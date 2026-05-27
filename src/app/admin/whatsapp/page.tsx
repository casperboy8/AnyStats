'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

type WaStatus = {
  status: 'initializing' | 'qr_needed' | 'connected' | 'disconnected';
  qr: string | null;
  phoneNumber: string | null;
  error: string | null;
};

const STATUS_LABELS: Record<WaStatus['status'], string> = {
  initializing: 'Bezig met verbinden…',
  qr_needed: 'Scan de QR-code',
  connected: 'Verbonden ✓',
  disconnected: 'Niet verbonden',
};

const STATUS_COLORS: Record<WaStatus['status'], string> = {
  initializing: 'bg-yellow-100 text-yellow-700',
  qr_needed: 'bg-orange-100 text-orange-700',
  connected: 'bg-green-100 text-green-700',
  disconnected: 'bg-red-100 text-red-700',
};

export default function AdminWhatsappPage() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/whatsapp/status');
    if (res.ok) {
      const data: WaStatus = await res.json();
      setStatus(data);
    }
  }, []);

  // Stel polling in op basis van status
  useEffect(() => {
    load(); // eerste fetch

    // Poll elke 3s als we wachten op QR of opstarten
    pollRef.current = setInterval(() => {
      setStatus(prev => {
        if (prev?.status === 'qr_needed' || prev?.status === 'initializing') {
          load();
        }
        return prev;
      });
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  async function init() {
    setInitializing(true);
    await fetch('/api/admin/whatsapp/init', { method: 'POST' });
    setTimeout(() => {
      load();
      setInitializing(false);
    }, 2000);
  }

  async function disconnect() {
    if (!confirm('Weet je zeker dat je WhatsApp wilt ontkoppelen?')) return;
    setDisconnecting(true);
    await fetch('/api/admin/whatsapp/disconnect', { method: 'POST' });
    setDisconnecting(false);
    load();
  }

  async function sendTest() {
    setTestResult('');
    setTestLoading(true);
    const res = await fetch('/api/admin/whatsapp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, message: testMsg }),
    });
    setTestLoading(false);
    const data = await res.json();
    setTestResult(res.ok ? '✓ Bericht verstuurd!' : `✗ ${data.error}`);
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-gray-700 text-sm">← Admin</Link>
        <h1 className="text-lg font-semibold text-gray-900">WhatsApp beheer</h1>
      </div>

      {/* Status kaart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Verbindingsstatus</h2>
          <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ↻ Vernieuwen
          </button>
        </div>

        {!status ? (
          <p className="text-sm text-gray-400">Laden…</p>
        ) : (
          <>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status.status]}`}>
              {STATUS_LABELS[status.status]}
            </span>

            {/* Foutmelding */}
            {status.error && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">Foutmelding:</p>
                <p className="text-xs text-red-600 font-mono break-all">{status.error}</p>
                {status.error.includes('Chrome') && (
                  <p className="text-xs text-gray-500 mt-2">
                    Voer dit uit in de terminal om Chrome te installeren:<br />
                    <span className="font-mono bg-gray-100 px-1 rounded">npx puppeteer browsers install chrome</span>
                  </p>
                )}
              </div>
            )}

            {/* Verbonden nummer */}
            {status.phoneNumber && (
              <p className="text-sm text-gray-600">
                Gekoppeld nummer: <span className="font-mono font-medium text-gray-900">{status.phoneNumber}</span>
              </p>
            )}

            {/* QR-code */}
            {status.status === 'qr_needed' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Open WhatsApp op de koppeltelefoon →{' '}
                  <strong>Instellingen → Gekoppelde apparaten → Apparaat koppelen</strong>
                </p>
                {status.qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={status.qr} alt="WhatsApp QR code" className="w-52 h-52 border border-gray-200 rounded-xl" />
                ) : (
                  <p className="text-sm text-gray-400 animate-pulse">QR-code genereren…</p>
                )}
                <p className="text-xs text-gray-400">De QR-code verloopt na ±20 seconden. De pagina ververst automatisch.</p>
              </div>
            )}

            {/* Opstarten bericht */}
            {status.status === 'initializing' && (
              <p className="text-sm text-gray-500 animate-pulse">
                Chrome en WhatsApp worden gestart… dit duurt 15–30 seconden.
              </p>
            )}

            {/* Acties */}
            <div className="flex gap-2 pt-1">
              {status.status === 'disconnected' && (
                <button
                  onClick={init}
                  disabled={initializing}
                  className="bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {initializing ? 'Bezig…' : '▶ Verbinden'}
                </button>
              )}
              {(status.status === 'connected' || status.status === 'qr_needed') && (
                <button
                  onClick={disconnect}
                  disabled={disconnecting}
                  className="border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {disconnecting ? 'Bezig…' : 'Ontkoppelen'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Testbericht */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Testbericht versturen</h2>
        <input
          type="tel"
          value={testPhone}
          onChange={e => setTestPhone(e.target.value)}
          placeholder="+31612345678"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <textarea
          value={testMsg}
          onChange={e => setTestMsg(e.target.value)}
          placeholder="Testbericht (optioneel)"
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
        {testResult && (
          <p className={`text-sm ${testResult.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>
            {testResult}
          </p>
        )}
        <button
          onClick={sendTest}
          disabled={testLoading || !testPhone.trim() || status?.status !== 'connected'}
          className="w-full bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {testLoading ? 'Versturen…' : 'Verstuur testbericht'}
        </button>
        {status?.status !== 'connected' && (
          <p className="text-xs text-gray-400 text-center">WhatsApp moet eerst verbonden zijn</p>
        )}
      </div>
    </div>
  );
}
