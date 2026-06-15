import { createCorsairDatabase } from 'corsair/db';
import { createAccountKeyManager } from 'corsair/core';
import { conn } from '@/server/db';
import { registerGoogleCalendarWebhook } from '@/server/lib/webhooks';

const watchExpirations = new Map<string, number>();

export function setWatchExpiration(tenantId: string, expiration: number) {
  watchExpirations.set(tenantId, expiration);
}

export async function renewWatchesIfNeeded(tenantId: string) {
  const kek = process.env.CORSAIR_KEK;
  if (!kek) return;
  
  const database = createCorsairDatabase(conn);
  const now = Date.now();
  const twoDays = 2 * 24 * 60 * 60 * 1000;

  const expiration = watchExpirations.get(tenantId);
  
  if (!expiration || (expiration - now) < twoDays) {
    console.log(`[Watch Renewal] Checking calendar watch for ${tenantId}`);
    
    const calKm = createAccountKeyManager({ 
      authType: 'oauth_2', 
      integrationName: 'googlecalendar', 
      tenantId, 
      kek, 
      database 
    });
    
    try {
      const accessToken = await calKm.get_access_token();
      if (accessToken) {
        console.log(`[Watch Renewal] Renewing calendar watch for ${tenantId}`);
        const result = await registerGoogleCalendarWebhook(accessToken, tenantId);
        if (result) {
          setWatchExpiration(tenantId, Number(result.expiration));
        }
      }
    } catch(e) {
      console.error(`[Watch Renewal] Failed to renew calendar watch for ${tenantId}:`, e);
    }
  }
}
