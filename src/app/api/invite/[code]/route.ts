import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrgMembership } from '@/lib/org';
import { getInviteWithOrg, inviteError, redeemInvite } from '@/lib/invites';
import { notifyAddedToOrg } from '@/lib/whatsapp/notifications';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invite = getInviteWithOrg(code);
  if (!invite) return NextResponse.json({ error: 'Ongeldige koppelcode' }, { status: 404 });

  const error = inviteError(invite);
  if (error) return NextResponse.json({ error }, { status: 410 });

  return NextResponse.json({
    org_name: invite.org_name,
    org_slug: invite.org_slug,
    role: invite.role,
    code: invite.code,
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });

  const { code } = await params;

  const invite = getInviteWithOrg(code);
  if (!invite) return NextResponse.json({ error: 'Ongeldige koppelcode' }, { status: 404 });

  const error = inviteError(invite);
  if (error) return NextResponse.json({ error }, { status: 410 });

  const existing = getOrgMembership(invite.organisation_id, session.id);
  if (existing) {
    return NextResponse.json({ ok: true, slug: invite.org_slug, already_member: true });
  }

  redeemInvite(invite, session.id);

  notifyAddedToOrg(session.id, invite.org_name, invite.role, invite.org_slug).catch(() => {});

  return NextResponse.json({ ok: true, slug: invite.org_slug });
}
