import webpush from 'web-push';
import db from './db';
import type { User } from './db';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@anytimer.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(userId: number, payload: { title: string; body: string; data?: Record<string, unknown> }) {
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
