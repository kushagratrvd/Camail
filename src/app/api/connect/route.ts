import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthUrl } from 'corsair/oauth';
import { corsair, ensureCredentialsSynced } from '@/server/corsair';
import { db } from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/server/auth';

async function needsConsentPrompt(plugin: string, tenantId: string): Promise<boolean> {
  const integration = await db.query.corsairIntegrations.findFirst({
    where: eq(corsairIntegrations.name, plugin),
  });
  if (!integration) return true;

  const account = await db.query.corsairAccounts.findFirst({
    where: and(
      eq(corsairAccounts.tenantId, tenantId),
      eq(corsairAccounts.integrationId, integration.id)
    ),
  });

  if (!account) return true;
  if (account.status === 'RECONNECT_REQUIRED' || account.status === 'ERROR') return true;
  return false;
}

export async function GET(req: NextRequest) {
  await ensureCredentialsSynced();

  // Verify the user is authenticated before proceeding
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const plugin = req.nextUrl.searchParams.get('plugin');
  const tenantId = req.nextUrl.searchParams.get('tenantId');

  if (!plugin || !tenantId) {
    return NextResponse.json(
      { error: 'Missing plugin or tenantId parameter' }, 
      { status: 400 }
    );
  }

  // Guard: tenantId in query string must match the authenticated session user.
  // Without this check, any user could craft a URL with another user's tenantId
  // and link their Google account to a different tenant's integration.
  if (tenantId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const REDIRECT_URI = new URL('/api/auth', req.nextUrl.origin).toString();

  const promptConsent = await needsConsentPrompt(plugin, tenantId);

  const { url, state } = await generateOAuthUrl(corsair, plugin, {
    tenantId,
    redirectUri: REDIRECT_URI,
    ...(promptConsent ? { prompt: 'consent' } : {}),
  });

  const response = NextResponse.redirect(url);
  
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60, // 10 minutes in seconds
  });

  return response;
}
