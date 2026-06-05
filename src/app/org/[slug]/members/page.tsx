'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Member = {
  id: string;
  user_id: number;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
};

type SessionUser = { id: number; username: string; role: string };
type Invite = { id: string; code: string; role: string; use_count: number; max_uses: number | null; expires_at: string | null; created_by_username: string };

export default function OrgMembersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [session, setSession] = useState<SessionUser | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  const [addUsername, setAddUsername] = useState('');
  const [addRole, setAddRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [meRes, membersRes, invitesRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch(`/api/organisations/${slug}/members`),
      fetch(`/api/org/${slug}/invites`),
    ]);
    const me = meRes.ok ? await meRes.json() : null;
    const membersData = membersRes.ok ? await membersRes.json() : [];
    const invitesData = invitesRes.ok ? await invitesRes.json() : [];
    setSession(me);
    setMembers(Array.isArray(membersData) ? membersData : []);
    setInvites(Array.isArray(invitesData) ? invitesData : []);
    if (me && Array.isArray(membersData)) {
      const myMember = membersData.find((m: Member) => m.user_id === me.id);
      const role = myMember?.role ?? null;
      setMyRole(role);
      // Super admins (site-rol) mogen altijd; org-leden alleen als owner/admin
      const isSuperAdmin = me.role === 'admin';
      if (!isSuperAdmin && role === 'member') {
        window.location.replace(`/org/${slug}`);
      }
      if (!isSuperAdmin && !role) {
        window.location.replace(`/dashboard`);
      }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function addMember() {
    setAddError(''); setAddLoading(true);
    const res = await fetch(`/api/organisations/${slug}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: addUsername, role: addRole }),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(data.error); return; }
    setAddUsername(''); load();
  }

  async function changeRole(userId: number, role: string) {
    await fetch(`/api/organisations/${slug}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    load();
  }

  async function removeMember(userId: number) {
    await fetch(`/api/organisations/${slug}/members/${userId}`, { method: 'DELETE' });
    load();
  }

  async function createInvite() {
    setInviteLoading(true);
    await fetch(`/api/org/${slug}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: inviteRole }),
    });
    setInviteLoading(false);
    load();
  }

  async function deleteInvite(code: string) {
    await fetch(`/api/org/${slug}/invites/${code}`, { method: 'DELETE' });
    load();
  }

  function copyInviteLink(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const isSuperAdmin = session?.role === 'admin';
  const isOwner = myRole === 'owner';
  const isAdmin = myRole === 'admin';
  const canManageMembers = isSuperAdmin || isOwner || isAdmin;

  // Super admins en owners mogen alle rollen toewijzen; org-admins alleen 'member'
  const addableRoles: Array<{ value: string; label: string }> = (isSuperAdmin || isOwner)
    ? [
        { value: 'member', label: 'Lid' },
        { value: 'admin', label: 'Admin' },
        { value: 'owner', label: 'Owner' },
      ]
    : [{ value: 'member', label: 'Lid' }];

  function canRemove(target: Member): boolean {
    if (target.user_id === session?.id) return false;
    if (isSuperAdmin || isOwner) return true;
    if (isAdmin) return target.role === 'member';
    return false;
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-amber-600">Laden...</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/org/${slug}`} className="text-gray-400 dark:text-gray-500 hover:text-gray-700 text-sm">← Dashboard</Link>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Leden</h1>
      </div>

      {canManageMembers && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Lid toevoegen</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              placeholder="Gebruikersnaam"
              className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
            {addableRoles.length > 1 && (
              <select
                value={addRole}
                onChange={e => setAddRole(e.target.value as 'member' | 'admin' | 'owner')}
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 dark:text-gray-100"
              >
                {addableRoles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
            <button
              onClick={addMember}
              disabled={addLoading || !addUsername.trim()}
              className="bg-gray-900 dark:bg-white hover:bg-gray-700 disabled:opacity-50 text-white dark:text-gray-900 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              {addLoading ? 'Bezig...' : 'Toevoegen'}
            </button>
          </div>
          {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
        </div>
      )}

      {/* Koppelcodes */}
      {canManageMembers && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Koppelcodes</h2>
          <div className="flex items-center gap-2 mb-3">
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'member' | 'admin')}
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="member">Lid</option>
              {(isSuperAdmin || isOwner) && <option value="admin">Admin</option>}
            </select>
            <button
              onClick={createInvite}
              disabled={inviteLoading}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
            >
              {inviteLoading ? 'Bezig...' : '+ Nieuwe code'}
            </button>
          </div>
          {invites.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">Nog geen koppelcodes aangemaakt.</p>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{inv.code}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                      {inv.role === 'admin' ? 'Admin' : 'Lid'} · {inv.use_count} gebruikt
                      {inv.max_uses !== null ? `/${inv.max_uses}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyInviteLink(inv.code)}
                      className="text-xs text-amber-600 hover:text-amber-800 transition-colors"
                    >
                      {copiedCode === inv.code ? 'Gekopieerd!' : 'Kopieer link'}
                    </button>
                    <button
                      onClick={() => deleteInvite(inv.code)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Verwijder
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{m.username}</span>
              <span className="hidden sm:inline text-gray-400 dark:text-gray-500 mx-2">·</span>
              <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">{m.email}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Rol-dropdown: owner en super admin mogen rollen wijzigen */}
              {(isSuperAdmin || isOwner) && m.user_id !== session?.id ? (
                <select
                  value={m.role}
                  onChange={e => changeRole(m.user_id, e.target.value)}
                  className="text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none"
                >
                  <option value="member">Lid</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              ) : (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  m.role === 'owner' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700' :
                  m.role === 'admin' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {m.role === 'owner' ? 'Owner' : m.role === 'admin' ? 'Admin' : 'Lid'}
                </span>
              )}

              {/* Verwijder-knop */}
              {canRemove(m) && (
                <button
                  onClick={() => removeMember(m.user_id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Verwijder
                </button>
              )}

              {m.user_id === session?.id && (
                <span className="text-xs text-gray-400 dark:text-gray-500">jij</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
