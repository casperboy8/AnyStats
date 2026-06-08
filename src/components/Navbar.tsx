'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from './NotificationBell';
import { useTheme } from './ThemeProvider';

type OrgItem = { id: string; name: string; slug: string; role: string };

type Props = {
  user: { username: string; role: string } | null;
  orgs: OrgItem[];
};

export default function Navbar({ user, orgs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
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
              ? `block px-4 py-3 text-sm font-medium border-b border-gray-50 ${pathname === `/org/${currentSlug}` ? 'text-amber-600' : 'text-gray-700 dark:text-gray-300'}`
              : `text-sm transition-colors ${pathname === `/org/${currentSlug}` ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
            }
          >
            Dashboard
          </Link>

          <Link
            href={`/org/${currentSlug}/leaderboard`}
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/leaderboard` ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
              : `text-sm transition-colors ${pathname === `/org/${currentSlug}/leaderboard` ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
            }
          >
            Klassement
          </Link>

          {canSeeMembers && (
            <Link
              href={`/org/${currentSlug}/members`}
              onClick={() => setMenuOpen(false)}
              className={mobile
                ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/members` ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
                : `text-sm transition-colors ${pathname === `/org/${currentSlug}/members` ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
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
                ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === `/org/${currentSlug}/settings` ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
                : `text-sm transition-colors ${pathname === `/org/${currentSlug}/settings` ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
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
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === '/dashboard' ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
              : `text-sm transition-colors ${pathname === '/dashboard' ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
            }
          >
            Dashboard
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setMenuOpen(false)}
            className={mobile
              ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname === '/leaderboard' ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
              : `text-sm transition-colors ${pathname === '/leaderboard' ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
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
            ? `block px-4 py-3 text-sm border-b border-gray-50 ${pathname.startsWith('/admin') ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`
            : `text-sm transition-colors ${pathname.startsWith('/admin') ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`
          }
        >
          Admin
        </Link>
      )}
    </>
  );

  // ── Mobiele onderbalk-tabs (max 3 directe + "Meer") ──
  const iconHome = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" /></svg>
  );
  const iconTrophy = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 21h8m-4-4v4m-5-17h10v4a5 5 0 01-10 0V4zm10 1h3v2a3 3 0 01-3 3m-10-5H4v2a3 3 0 003 3" /></svg>
  );
  const iconUsers = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-1a4 4 0 00-4-4h-1m-6 5H2v-1a4 4 0 014-4h4a4 4 0 014 4v1zm-2-9a3 3 0 11-6 0 3 3 0 016 0zm7-1a3 3 0 11-4 0" /></svg>
  );
  const iconMore = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
  );

  const bottomTabs: { href: string; label: string; active: boolean; icon: React.ReactNode }[] = currentSlug
    ? [
        { href: `/org/${currentSlug}`, label: 'Dashboard', active: pathname === `/org/${currentSlug}`, icon: iconHome },
        { href: `/org/${currentSlug}/leaderboard`, label: 'Klassement', active: pathname === `/org/${currentSlug}/leaderboard`, icon: iconTrophy },
        ...(canSeeMembers ? [{ href: `/org/${currentSlug}/members`, label: 'Leden', active: pathname === `/org/${currentSlug}/members`, icon: iconUsers }] : []),
      ]
    : [
        { href: '/dashboard', label: 'Dashboard', active: pathname === '/dashboard', icon: iconHome },
        { href: '/leaderboard', label: 'Klassement', active: pathname === '/leaderboard', icon: iconTrophy },
      ];

  return (
    <>
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
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
                className={`flex items-center gap-1 text-sm transition-colors ${currentOrg ? 'text-amber-600 font-medium' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
              >
                {currentOrg ? currentOrg.name : 'Groepen'}
                <svg className={`w-3 h-3 transition-transform ${orgOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {orgOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
                  {orgs.map(org => (
                    <Link
                      key={org.id}
                      href={`/org/${org.slug}`}
                      onClick={() => setOrgOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${org.slug === currentSlug ? 'text-amber-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
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
                    <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                      <Link href="/organisations" onClick={() => setOrgOpen(false)} className="block px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
            title={theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}
          >
            {theme === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
              </svg>
            )}
          </button>
          <NotificationBell />

          {/* Desktop: gebruikersnaam + uitloggen */}
          <div className="hidden sm:flex items-center gap-2">
            <Link
              href="/profile"
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              title="Profiel"
            >
              {user.username}
            </Link>
            <button
              onClick={logout}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-100"
            >
              Uitloggen
            </button>
          </div>
        </div>
      </div>

    </nav>

    {/* ── Mobiele onderbalk (tab bar) ── */}
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800 flex pb-[env(safe-area-inset-bottom)]">
      {bottomTabs.map(tab => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${tab.active ? 'text-amber-600' : 'text-gray-400 dark:text-gray-500'}`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </Link>
      ))}
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Meer"
        className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${menuOpen ? 'text-amber-600' : 'text-gray-400 dark:text-gray-500'}`}
      >
        {iconMore}
        <span>Meer</span>
      </button>
    </nav>

    {/* ── "Meer" bottom sheet ── */}
    {menuOpen && (
      <div className="sm:hidden fixed inset-0 z-50" onClick={() => setMenuOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="absolute bottom-0 inset-x-0 bg-white dark:bg-gray-900 rounded-t-2xl border-t border-gray-100 dark:border-gray-800 p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Org-switcher */}
          {showSwitcher && (
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Groep</p>
              <div className="flex flex-wrap gap-1.5">
                {orgs.map(org => (
                  <Link
                    key={org.id}
                    href={`/org/${org.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      org.slug === currentSlug
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {org.name}
                  </Link>
                ))}
                {isOwnerAnywhere && (
                  <Link href="/organisations/new" onClick={() => setMenuOpen(false)} className="px-3 py-1.5 rounded-full text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 transition-colors">
                    + Nieuw
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Secundaire links */}
          <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-800 border-y border-gray-100 dark:border-gray-800 -mx-1">
            <Link href="/profile" onClick={() => setMenuOpen(false)} className="px-1 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
              Profiel ({user.username})
            </Link>
            {isCurrentOrgOwner && currentSlug && (
              <Link href={`/org/${currentSlug}/settings`} onClick={() => setMenuOpen(false)} className="px-1 py-3 text-sm text-gray-700 dark:text-gray-300">
                Instellingen
              </Link>
            )}
            {user.role === 'admin' && (
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="px-1 py-3 text-sm text-gray-700 dark:text-gray-300">
                Admin
              </Link>
            )}
            <button
              onClick={() => { toggleTheme(); }}
              className="px-1 py-3 text-sm text-gray-700 dark:text-gray-300 text-left flex items-center justify-between"
            >
              <span>{theme === 'dark' ? 'Lichte modus' : 'Donkere modus'}</span>
            </button>
          </div>

          <button
            onClick={() => { setMenuOpen(false); logout(); }}
            className="w-full py-2.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            Uitloggen
          </button>
        </div>
      </div>
    )}
    </>
  );
}
