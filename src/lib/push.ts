import webpush from 'web-push';
import db from './db';
import type { User } from './db';

// Zonder VAPID-keys werkt web push niet — dan worden pushes stilletjes overgeslagen
// in plaats van dat elke route die dit module importeert crasht.
const vapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:admin@anytimer.app',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
} else {
  console.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY niet gezet — push-notificaties uitgeschakeld');
}

export async function sendPushToUser(userId: number, payload: { title: string; body: string; data?: Record<string, unknown> }) {
  if (!vapidConfigured) return;

  const user = db.prepare('SELECT push_subscription FROM users WHERE id = ?').get(userId) as Pick<User, 'push_subscription'> | undefined;

  if (!user?.push_subscription) return;

  try {
    const subscription = JSON.parse(user.push_subscription);
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch {
    db.prepare('UPDATE users SET push_subscription = NULL WHERE id = ?').run(userId);
  }
}

export function createNotification(userId: number, type: string, message: string, relatedId?: number) {
  db.prepare(
    'INSERT INTO notifications (user_id, type, message, related_id) VALUES (?, ?, ?, ?)'
  ).run(userId, type, message, relatedId ?? null);
}
