import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/server/lib/tenant';
import { corsair, ensureCredentialsSynced } from '@/server/corsair';
import { generateOAuthUrl } from 'corsair/oauth';

export async function GET(req: NextRequest) {
  const tenantId = await getTenantId();
  if (!tenantId) return new Response('Unauthorized', { status: 401 });

  await ensureCredentialsSynced();

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/corsair/callback`;

  const { url } = await generateOAuthUrl(corsair, 'gmail', {
    tenantId,
    redirectUri,
  });

  const parsedUrl = new URL(url);
  const existingScope = parsedUrl.searchParams.get('scope') || '';
  const scopes = existingScope.split(' ');
  const calendarScope = 'https://www.googleapis.com/auth/calendar';
  
  if (!scopes.includes(calendarScope)) {
    scopes.push(calendarScope);
  }
  
  parsedUrl.searchParams.set('scope', scopes.join(' '));
  parsedUrl.searchParams.set('prompt', 'consent');
  parsedUrl.searchParams.set('access_type', 'offline');

  return NextResponse.redirect(parsedUrl.toString());
}
