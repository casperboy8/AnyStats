'use client';

import { useState, useEffect, useRef } from 'react';

type Notif = {
  id: number;
  type: string;
  message: string;
  is_read: number;
  created_at: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNotifications(data);
    });

    const interval = setInterval(() => {
      fetch('/api/notifications').then(r => r.json()).then(data => {
        if (Array.isArray(data)) setNotifications(data);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleOpen() {
    setOpen(o => !o);
    if (!open && unread > 0) {
      fetch('/api/notifications', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors"
        aria-label="Notificaties"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute left-2 right-2 top-[3.5rem] sm:left-auto sm:right-0 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-amber-100 dark:border-gray-800 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-gray-800">
            <h3 className="font-semibold text-amber-900 dark:text-amber-300">Notificaties</h3>
          </div>
          <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-gray-400 dark:text-gray-500 text-sm">Geen notificaties</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 text-sm ${!n.is_read ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                >
                  <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    {new Date(n.created_at).toLocaleString('nl-NL')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
