/**
 * Rol-helpers voor AnyStats.
 *
 * Hiërarchie (hoog → laag):
 *   owner  (rank 3) — kan alles; org aanmaken, leden/admins toevoegen, rollen wijzigen, org verwijderen
 *   admin  (rank 2) — kan members toevoegen/verwijderen; NIET admins/owners aanraken
 *   member (rank 1) — alleen lezen/deelnemen
 */

import db from './db';
import type { OrganisationMember } from './db';

export type OrgRole = 'owner' | 'admin' | 'member';

export const ROLE_RANK: Record<OrgRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/** Heeft de gebruiker minimaal `minRole` in deze org? */
export function hasMinRole(membership: OrganisationMember, minRole: OrgRole): boolean {
  return ROLE_RANK[membership.role] >= ROLE_RANK[minRole];
}

/** Is de gebruiker owner van deze organisatie? */
export function isOrgOwner(userId: number, orgId: string): boolean {
  const row = db
    .prepare("SELECT role FROM organisation_members WHERE organisation_id = ? AND user_id = ? AND role = 'owner'")
    .get(orgId, userId);
  return row !== undefined;
}

/** Is de gebruiker admin (of hoger) van deze organisatie? */
export function isOrgAdmin(userId: number, orgId: string): boolean {
  const row = db
    .prepare(
      "SELECT role FROM organisation_members WHERE organisation_id = ? AND user_id = ? AND role IN ('owner','admin')"
    )
    .get(orgId, userId);
  return row !== undefined;
}

/** Is de gebruiker lid (welke rol dan ook) van deze organisatie? */
export function isOrgMember(userId: number, orgId: string): boolean {
  const row = db
    .prepare('SELECT role FROM organisation_members WHERE organisation_id = ? AND user_id = ?')
    .get(orgId, userId);
  return row !== undefined;
}

/**
 * Bepaalt of de requestende gebruiker de rol van een ander lid mag wijzigen.
 *
 * Regels:
 * - Alleen owner mag rollen wijzigen (ook van admins)
 * - Admin mag NIET het rol-veld aanraken
 */
export function canChangeRole(actorMembership: OrganisationMember): boolean {
  return actorMembership.role === 'owner';
}

/**
 * Bepaalt of de requestende gebruiker een lid mag verwijderen.
 *
 * Regels:
 * - Owner mag iedereen verwijderen (behalve de laatste owner)
 * - Admin mag alleen `member`-rollen verwijderen
 * - Member mag niemand verwijderen (ook niet zichzelf via deze API)
 */
export function canRemoveMember(
  actorMembership: OrganisationMember,
  targetMembership: OrganisationMember
): boolean {
  if (actorMembership.role === 'owner') return true;
  if (actorMembership.role === 'admin') return targetMembership.role === 'member';
  return false;
}

/**
 * Bepaalt welke rollen de actor mag toewijzen bij het toevoegen van een lid.
 *
 * Owner → owner, admin, member
 * Admin → member (alleen)
 */
export function allowedRolesToAssign(actorMembership: OrganisationMember): OrgRole[] {
  if (actorMembership.role === 'owner') return ['owner', 'admin', 'member'];
  if (actorMembership.role === 'admin') return ['member'];
  return [];
}
