import { NextRequest, NextResponse } from 'next/server';
import { corsair } from '@/server/corsair';
import { processOAuthCallback } from 'corsair/oauth';
import { createAccountKeyManager } from 'corsair/core';
import { registerGoogleCalendarWebhook } from '@/server/lib/webhooks';
import { db, conn } from '@/server/db';
import { createCorsairDatabase } from 'corsair/db';
import crypto from 'node:crypto';
import { env } from '@/env';

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  if (!code || !state) return NextResponse.redirect(`${origin}/?error=MissingParams`);

  try {
    const { tenantId } = await processOAuthCallback(corsair, {
      code, 
      state, 
      redirectUri: `${origin}/api/corsair/callback`,
    });

    const database = createCorsairDatabase(conn);
    const kek = process.env.CORSAIR_KEK!;

    const calendarInt = await database.db
      .selectFrom('corsair_integrations')
      .selectAll()
      .where('name', '=', 'googlecalendar')
      .executeTakeFirst();
    
    if (calendarInt) {
      let calAccount = await database.db
        .selectFrom('corsair_accounts')
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('integration_id', '=', calendarInt.id)
        .executeTakeFirst();
        
      if (!calAccount) {
        await database.db.insertInto('corsair_accounts').values({
          id: crypto.randomUUID(), 
          tenant_id: tenantId, 
          integration_id: calendarInt.id, 
          config: JSON.stringify({}), 
          created_at: new Date(), 
          updated_at: new Date()
        }).execute();
      }

      const gmailKm = createAccountKeyManager({ 
        authType: 'oauth_2', 
        integrationName: 'gmail', 
        tenantId, 
        kek, 
        database 
      });
      const calKm = createAccountKeyManager({ 
        authType: 'oauth_2', 
        integrationName: 'googlecalendar', 
        tenantId, 
        kek, 
        database 
      });
      
      try {
        await calKm.get_dek();
      } catch {
        await calKm.issue_new_dek();
      }
      
      const accessToken = await gmailKm.get_access_token();
      if (accessToken) {
        await calKm.set_access_token(accessToken);
        await registerGoogleCalendarWebhook(accessToken, tenantId);
      }
      
      const refreshToken = await gmailKm.get_refresh_token();
      if (refreshToken) {
        await calKm.set_refresh_token(refreshToken);
      }
    }

    return NextResponse.redirect(`${origin}/`);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    return NextResponse.redirect(`${origin}/?error=OAuthFailed`);
  }
}
