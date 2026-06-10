/**
 * Gedeelde logica voor koppelcodes (organisation_invites).
 * Gebruikt door login, registratie en de invite-API.
 */

import { randomUUID } from 'crypto';
import db from './db';
import { getOrgMembership } from './org';
import type { OrganisationInvite } from './db';

export type InviteWithOrg = OrganisationInvite & { org_name: string; org_slug: string };

/** Zoek een koppelcode op, inclusief org-naam en -slug. */
export function getInviteWithOrg(code: string): InviteWithOrg | undefined {
  return db.prepare(`
    SELECT i.*, o.name AS org_name, o.slug AS org_slug
    FROM organisation_invites i
    JOIN organisations o ON o.id = i.organisation_id
    WHERE i.code = ?
  `).get(code) as InviteWithOrg | undefined;
}

/** Geeft een foutmelding terug als de invite niet (meer) bruikbaar is, anders null. */
export function inviteError(invite: InviteWithOrg): string | null {
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return 'Deze koppelcode is verlopen';
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return 'Deze koppelcode is al maximaal gebruikt';
  }
  return null;
}

/** Zoek een koppelcode op en geef hem alleen terug als hij nog geldig is. */
export function findValidInvite(code: string): InviteWithOrg | null {
  const invite = getInviteWithOrg(code);
  if (!invite || inviteError(invite)) return null;
  return invite;
}

/**
 * Maak de gebruiker lid via de invite en verhoog de teller.
 * Geen-op als de gebruiker al lid is van de organisatie.
 */
export function redeemInvite(invite: InviteWithOrg, userId: number): void {
  if (getOrgMembership(invite.organisation_id, userId)) return;

  db.transaction(() => {
    db.prepare(
      'INSERT INTO organisation_members (id, organisation_id, user_id, role) VALUES (?, ?, ?, ?)'
    ).run(randomUUID(), invite.organisation_id, userId, invite.role);
    db.prepare('UPDATE organisation_invites SET use_count = use_count + 1 WHERE id = ?').run(invite.id);
  })();
}
