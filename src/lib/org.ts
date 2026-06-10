import { redirect } from 'next/navigation';
import { getSession } from './auth';
import db from './db';
import { ROLE_RANK, hasMinRole } from './permissions';
import type { OrgRole } from './permissions';
import type { Organisation, OrganisationMember } from './db';

// Her-export zodat bestaande imports vanuit '@/lib/org' blijven werken
export { hasMinRole };
export type { OrgRole };

/**
 * Controleer of de ingelogde gebruiker lid is van de org met de gegeven slug.
 * Optioneel: eis een minimale rol. Redirect bij geen toegang.
 */
export async function requireOrgMember(slug: string, minRole: OrgRole = 'member') {
  const session = await getSession();
  if (!session) redirect('/login');

  const org = db
    .prepare('SELECT * FROM organisations WHERE slug = ?')
    .get(slug) as Organisation | undefined;
  if (!org) redirect('/organisations');

  const membership = db
    .prepare('SELECT * FROM organisation_members WHERE organisation_id = ? AND user_id = ?')
    .get(org.id, session.id) as OrganisationMember | undefined;

  if (!membership) {
    // Geen lid van déze org — stuur naar juiste plek op basis van andere orgs
    const userOrgs = getUserOrgs(session.id);
    if (userOrgs.length === 0) redirect('/no-organisation');
    if (userOrgs.length === 1) redirect(`/org/${userOrgs[0].slug}`);
    redirect('/select-org');
  }

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    redirect(`/org/${slug}`);
  }

  return { session, org, membership };
}

/**
 * Haal alle organisaties op waar de gebruiker lid van is, inclusief zijn rol.
 */
export function getUserOrgs(userId: number) {
  return db
    .prepare(`
      SELECT o.*, om.role
      FROM organisations o
      JOIN organisation_members om ON o.id = om.organisation_id
      WHERE om.user_id = ?
      ORDER BY o.name
    `)
    .all(userId) as (Organisation & { role: OrgRole })[];
}

/**
 * Controleer lidmaatschap zonder redirect (voor API routes).
 * Geeft null terug als de gebruiker geen toegang heeft.
 */
export function getOrgMembership(orgId: string, userId: number) {
  return db
    .prepare('SELECT * FROM organisation_members WHERE organisation_id = ? AND user_id = ?')
    .get(orgId, userId) as OrganisationMember | undefined;
}
