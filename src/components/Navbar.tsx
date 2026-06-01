'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from './NotificationBell';

type OrgItem = { id: string; name: string; slug: string; role: string };

type Props = {
  user: { username: string; role: string } | null;
  orgs: OrgItem[];
};

export default function Navbar({ user, orgs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [orgOpen, setOrgOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const orgSlugMatch = pathname.match(/^\/org\/([^/]+)/);
  const currentSlug = orgSlugMatch?.[1] ?? null;
  const currentOrg = orgs.find(o => o.slug === currentSlug);

  const isOwnerAnywhere = orgs.some(o => o.role === 'owner');
  const isCurrentOrgOwner = currentOrg?.role === 'owner';
  const isCurrentOrgAdmin = currentOrg?.role === 'admin';
  const canSeeMembers = isCurrentOrgOwner || isCurrentOrgAdmin || user?.role === 'admin';
  const multipleOrgs = orgs.length > 1;
  const showSwitcher = orgs.length > 0;

  // Sluit dropdowns als buiten geklikt
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOrgOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sluit mobiel menu bij navigatie
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  if (!user) return null;

  // Gedeelde nav-links (zowel desktop als mobiel menu)
  const orgLinks = (mobile = false) => (
    <>
      {currentSlug ? (
        <>
          <Link
            href={`/org/${currentSlug}`}
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm font-medium border-b border-gray-50 ${pathname === `/org/${currentSlug}` ? 'text-amber-600' : 'text-gray-700'}`
              : `text-sm transition-colors ${pathname === `/org/${currentSlug}` ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
            }
          >
            Dashboard
          </Link>

          <Link
            href={`/org/${currentSlug}/leaderboard`}
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/leaderboard` ? 'text-amber-600 font-medium' : 'text-gray-700'}`
              : `text-sm transition-colors ${pathname === `/org/${currentSlug}/leaderboard` ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
            }
          >
            Klassement
          </Link>

          {canSeeMembers && (
            <Link
              href={`/org/${currentSlug}/members`}
              onClick={() => setMenuOpen(false)}
              className={mobile
                ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/members` ? 'text-amber-600 font-medium' : 'text-gray-700'}`
                : `text-sm transition-colors ${pathname === `/org/${currentSlug}/members` ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
              }
            >
              Leden
            </Link>
          )}

          {isCurrentOrgOwner && (
            <Link
              href={`/org/${currentSlug}/settings`}
              onClick={() => setMenuOpen(false)}
              className={mobile
                ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/settings` ? 'text-amber-600 font-medium' : 'text-gray-700'}`
                : `text-sm transition-colors ${pathname === `/org/${currentSlug}/settings` ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
              }
              title="Instellingen"
            >
              {mobile ? 'Instellingen' : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </Link>
          )}
        </>
      ) : (
        <>
          <Link
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === '/dashboard' ? 'text-amber-600 font-medium' : 'text-gray-700'}`
              : `text-sm transition-colors ${pathname === '/dashboard' ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
            }
          >
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === '/leaderboard' ? 'text-amber-600 font-medium' : 'text-gray-700'}`
              : `text-sm transition-colors ${pathname === '/leaderboard' ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
            }
          >
            Klassement
          </Link>
        </>
      )}

      {user.role === 'admin' && (
        <Link
          href="/admin"
          onClick={() => setMenuOpen(false)}
          className={mobile
            ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname.startsWith('/admin') ? 'text-amber-600 font-medium' : 'text-gray-700'}`
            : `text-sm transition-colors ${pathname.startsWith('/admin') ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`
          }
        >
          Admin
        </Link>
      )}
    </>
  );

  return (
    <nav className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">

        {/* ── Linkerkant ── */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">

          {/* Logo */}
          <Link
            href={currentSlug ? `/org/${currentSlug}` : '/dashboard'}
            className="flex items-center gap-2 shrink-0"
            title="AnyStats"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/anystats-icon.svg" alt="" className="h-8 w-8 rounded-md" />
            <span className="font-bold text-base tracking-tight text-[#1D3557] leading-none">
              Any<span className="text-[#3AACB8]">Stats</span>
            </span>
          </Link>

          {/* Org-switcher — desktop */}
          {showSwitcher && (
            <div className="relative hidden sm:block" ref={dropdownRef}>
              <button
                onClick={() => setOrgOpen(v => !v)}
                className={`flex items-center gap-1 text-sm transition-colors ${currentOrg ? 'text-amber-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {currentOrg ? currentOrg.name : 'Groepen'}
                <svg className={`w-3 h-3 transition-transform ${orgOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {orgOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  {orgs.map(org => (
                    <Link
                      key={org.id}
                      href={`/org/${org.slug}`}
                      onClick={() => setOrgOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${org.slug === currentSlug ? 'text-amber-600 font-medium' : 'text-gray-700'}`}
                    >
                      <span className="truncate">{org.name}</span>
                      {org.slug === currentSlug && (
                        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </Link>
                  ))}
                  {isOwnerAnywhere && (
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <Link href="/organisations" onClick={() => setOrgOpen(false)} className="block px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors">
                        Alle groepen →
                      </Link>
                      <Link href="/organisations/new" onClick={() => setOrgOpen(false)} className="block px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 transition-colors font-medium">
                        + Nieuwe groep
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Nav-links — desktop */}
          <div className="hidden sm:flex items-center gap-5">
            {orgLinks(false)}
          </div>
        </div>

        {/* ── Rechterkant ── */}
        <div className="flex items-center gap-2">
          <NotificationBell />

          {/* Desktop: gebruikersnaam + uitloggen */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/profile"
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              title="Profiel"
            >
              {user.username}
            </Link>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            >
              Uitloggen
            </button>
          </div>

          {/* Mobiel: hamburger */}
          <button
            className="sm:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobiel menu ── */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 shadow-lg">
          {/* Org-switcher in mobiel menu */}
          {showSwitcher && (
            <div className="px-4 py-2 border-b border-gray-50">
              <p className="text-xs text-gray-400 mb-1.5">Groep</p>
              <div className="flex flex-wrap gap-1.5">
                {orgs.map(org => (
                  <Link
                    key={org.id}
                    href={`/org/${org.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      org.slug === currentSlug
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {org.name}
                  </Link>
                ))}
                {isOwnerAnywhere && (
                  <Link href="/organisations/new" onClick={() => setMenuOpen(false)} className="px-3 py-1.5 rounded-full text-sm text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors">
                    + Nieuw
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Nav-links */}
          <div>
            {orgLinks(true)}
          </div>

          {/* Profiel + Uitloggen */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="text-sm text-gray-600 font-medium">
              {user.username}
            </Link>
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              className="text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              Uitloggen
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
