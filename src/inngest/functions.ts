import { inngest } from './client';
import { corsair } from '@/server/corsair';
import { processWebhook } from 'corsair';
import { db, conn } from '@/server/db';
import { corsairAccounts, corsairIntegrations, corsairWebhooks } from '@/server/db/schema';
import { and, eq, or, lt } from 'drizzle-orm';
import { registerGmailWebhook, registerGoogleCalendarWebhook } from '@/server/lib/webhooks';
import { createAccountKeyManager } from 'corsair/core';
import { createCorsairDatabase } from 'corsair/db';

export const syncGmailWebhook = inngest.createFunction(
  {
    id: 'sync-gmail-webhook',
    name: 'Sync Gmail Webhook',
    concurrency: {
      limit: 1,
      key: 'event.data.activeTenantId',
    },
    triggers: [{ event: 'gmail.webhook.received' }],
  },
  async ({ event, step }) => {
    const { headersObj, body, activeTenantId } = event.data;

    let result: { plugin?: string | null; action?: string | null } | null = null;
    result = await step.run('run-process-webhook', async () => {
      try {
        const res = await processWebhook(corsair, headersObj, body, {
          tenantId: activeTenantId,
        });
        return res;
      } catch (err) {
        const errorObj = err as Error;
        const errMsg = String(errorObj.message || errorObj).toLowerCase();
        if (errMsg.includes('account not found')) {
          console.warn(`[Webhook] Ignoring orphaned webhook for tenant ${activeTenantId}`);
          return null;
        }
        throw err;
      }
    });

    if (result?.plugin) {
      console.log(`[Inngest Webhook] Handled by ${result.plugin}.${result.action} for tenant ${activeTenantId}`);
    } else {
      console.warn(`[Inngest Webhook] Unmatched webhook received.`);
    }
    return { success: true, result };
  }
);

export async function processIntegrationConnected(tenantId: string, plugin: string) {
  const kek = process.env.CORSAIR_KEK;

  // Helper to get access token for plugin
  const getAccessToken = async () => {
    if (!kek) return null;
    const database = createCorsairDatabase(conn);
    const km = createAccountKeyManager({
      authType: 'oauth_2',
      integrationName: plugin,
      tenantId,
      kek,
      database,
    });
    return await km.get_access_token().catch(() => null);
  };

  // Step 1: Register Webhook & Save Metadata
  try {
    const accessToken = await getAccessToken();
    if (accessToken) {
      const webhookId = `wh_${tenantId}_${plugin}`;

      if (plugin === 'gmail') {
        const topicId = process.env.GMAIL_PUBSUB_TOPIC || process.env.TOPIC_ID || process.env.GMAIL_TOPIC_ID;
        if (topicId && !topicId.includes('your-project')) {
          const res = await registerGmailWebhook(accessToken, tenantId, topicId);
          if (res) {
            await db
              .insert(corsairWebhooks)
              .values({
                id: webhookId,
                tenantId,
                plugin: 'gmail',
                historyId: String(res.historyId || ''),
                watchExpiration: new Date(Number(res.expiration)),
              })
              .onConflictDoUpdate({
                target: [corsairWebhooks.id],
                set: {
                  historyId: String(res.historyId || ''),
                  watchExpiration: new Date(Number(res.expiration)),
                  updatedAt: new Date(),
                },
              });
          }
        }
      } else if (plugin === 'googlecalendar') {
        const res = await registerGoogleCalendarWebhook(accessToken, tenantId);
        if (res) {
          await db
            .insert(corsairWebhooks)
            .values({
              id: webhookId,
              tenantId,
              plugin: 'googlecalendar',
              channelId: res.id,
              resourceId: res.resourceId,
              channelExpiration: new Date(Number(res.expiration)),
            })
            .onConflictDoUpdate({
              target: [corsairWebhooks.id],
              set: {
                channelId: res.id,
                resourceId: res.resourceId,
                channelExpiration: new Date(Number(res.expiration)),
                updatedAt: new Date(),
              },
            });
        }
      }
    }
  } catch (err) {
    console.warn(`[Integration Connected] Non-fatal webhook registration error for ${tenantId} (${plugin}):`, err);
  }

  // Step 2: Initial Backfill & Update Status to CONNECTED
  const integration = await db.query.corsairIntegrations.findFirst({
    where: eq(corsairIntegrations.name, plugin),
  });

  if (!integration) return;

  const account = await db.query.corsairAccounts.findFirst({
    where: and(
      eq(corsairAccounts.tenantId, tenantId),
      eq(corsairAccounts.integrationId, integration.id)
    ),
  });

  // Idempotency check: if user disconnected while SYNCING, don't revert to CONNECTED
  if (!account || account.status === 'DISCONNECTED') {
    console.log(`[Integration Connected] Account for ${tenantId} (${plugin}) was disconnected during setup.`);
    return;
  }

  try {
    const tenant = corsair.withTenant(tenantId);
    if (plugin === 'gmail' && tenant.gmail) {
      const listRes = await tenant.gmail.api.messages.list({ maxResults: 50 }).catch(() => null);
      if (listRes?.messages) {
        await Promise.all(
          listRes.messages.map((m) => (m.id ? tenant.gmail!.api.messages.get({ id: m.id, format: 'full' }).catch(() => null) : null))
        );
      }
    } else if (plugin === 'googlecalendar' && tenant.googlecalendar) {
      await tenant.googlecalendar.api.events.getMany({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
      }).catch(() => null);
    }

    // Re-verify account still exists before marking CONNECTED
    await db
      .update(corsairAccounts)
      .set({
        status: 'CONNECTED',
        statusError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(corsairAccounts.tenantId, tenantId),
          eq(corsairAccounts.integrationId, integration.id)
        )
      );
    console.log(`[Integration Connected] Successfully setup ${plugin} for tenant ${tenantId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(corsairAccounts)
      .set({
        status: 'ERROR',
        statusError: message,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(corsairAccounts.tenantId, tenantId),
          eq(corsairAccounts.integrationId, integration.id)
        )
      );
  }
}

export const handleIntegrationConnected = inngest.createFunction(
  {
    id: 'handle-integration-connected',
    name: 'Handle Integration Connected',
    triggers: [{ event: 'integration.connected' }],
  },
  async ({ event, step }) => {
    const { tenantId, plugin } = event.data as { tenantId: string; plugin: string };
    await step.run('process-integration-connected', async () => {
      await processIntegrationConnected(tenantId, plugin);
    });
    return { completed: true };
  }
);

export const renewExpiringWebhooks = inngest.createFunction(
  {
    id: 'renew-expiring-webhooks',
    name: 'Renew Expiring Webhooks',
    triggers: [{ cron: '0 0 * * *' }], // Daily cron
  },
  async ({ step }) => {
    const kek = process.env.CORSAIR_KEK;
    if (!kek) return { count: 0 };

    const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Multi-column expiration query using OR (watchExpiration OR channelExpiration)
    const expiringWatches = await db.query.corsairWebhooks.findMany({
      where: or(
        lt(corsairWebhooks.watchExpiration, in24Hours),
        lt(corsairWebhooks.channelExpiration, in24Hours)
      ),
    });

    let renewed = 0;
    for (const watch of expiringWatches) {
      await step.run(`renew-${watch.plugin}-${watch.tenantId}`, async () => {
        try {
          const database = createCorsairDatabase(conn);
          const km = createAccountKeyManager({
            authType: 'oauth_2',
            integrationName: watch.plugin,
            tenantId: watch.tenantId,
            kek,
            database,
          });
          const accessToken = await km.get_access_token();
          if (!accessToken) return;

          if (watch.plugin === 'gmail') {
            const topicId = process.env.GMAIL_PUBSUB_TOPIC || 'projects/your-project/topics/gmail-push';
            const res = await registerGmailWebhook(accessToken, watch.tenantId, topicId);
            if (res) {
              await db
                .update(corsairWebhooks)
                .set({
                  historyId: String(res.historyId || ''),
                  watchExpiration: new Date(Number(res.expiration)),
                  updatedAt: new Date(),
                })
                .where(eq(corsairWebhooks.id, watch.id));
              renewed++;
            }
          } else if (watch.plugin === 'googlecalendar') {
            const res = await registerGoogleCalendarWebhook(accessToken, watch.tenantId);
            if (res) {
              await db
                .update(corsairWebhooks)
                .set({
                  channelId: res.id,
                  resourceId: res.resourceId,
                  channelExpiration: new Date(Number(res.expiration)),
                  updatedAt: new Date(),
                })
                .where(eq(corsairWebhooks.id, watch.id));
              renewed++;
            }
          }
        } catch (e) {
          console.error(`[Webhook Renewal] Error renewing ${watch.plugin} for tenant ${watch.tenantId}:`, e);
        }
      });
    }

    return { renewed };
  }
);
