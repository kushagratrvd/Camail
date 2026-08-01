import { createCorsairDatabase } from 'corsair/db';
import { createIntegrationKeyManager } from 'corsair/core';
import { conn } from '@/server/db';
import * as crypto from 'node:crypto';
import { env } from '@/env';

export async function syncGoogleCredentialsFromEnv() {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const kek = process.env.CORSAIR_KEK;
  if (!clientId || !clientSecret || !kek) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and CORSAIR_KEK must be set');
  }

  const database = createCorsairDatabase(conn);

  for (const pluginName of ['gmail', 'googlecalendar'] as const) {
    let integration = await database.db
      .selectFrom('corsair_integrations')
      .selectAll()
      .where('name', '=', pluginName)
      .executeTakeFirst();

    if (!integration) {
      const id = crypto.randomUUID();
      await database.db.insertInto('corsair_integrations').values({
        id, 
        name: pluginName, 
        config: {},
        created_at: new Date(), 
        updated_at: new Date(),
      }).execute();
      
      const newIntegration = await database.db
        .selectFrom('corsair_integrations')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirstOrThrow();
        
      integration = newIntegration;
    }

    if (!integration) throw new Error('Integration not found after insert');

    const km = createIntegrationKeyManager({
      authType: 'oauth_2', 
      integrationName: pluginName, 
      kek, 
      database,
    });
    
    try {
      if (!integration.dek) {
        await km.issue_new_dek();
      }
      await km.set_client_id(clientId);
      await km.set_client_secret(clientSecret);
    } catch (e) {
      console.warn(`[corsair-init] Resetting corrupted config and re-issuing DEK for ${pluginName}...`);
      await database.db
        .updateTable('corsair_integrations')
        .set({ config: {}, dek: null, updated_at: new Date() })
        .where('id', '=', integration.id)
        .execute();

      const freshKm = createIntegrationKeyManager({
        authType: 'oauth_2',
        integrationName: pluginName,
        kek,
        database,
      });

      await freshKm.issue_new_dek();
      await freshKm.set_client_id(clientId);
      await freshKm.set_client_secret(clientSecret);
    }
  }
}
