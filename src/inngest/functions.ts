import { inngest } from './client';
import { corsair } from '@/server/corsair';
import { processWebhook } from 'corsair';
import { db, conn } from '@/server/db';
import { corsairAccounts, corsairIntegrations, corsairWebhooks, automations, automationRuns } from '@/server/db/schema';
import { and, eq, or, lt, lte } from 'drizzle-orm';
import { registerGmailWebhook, registerGoogleCalendarWebhook } from '@/server/lib/webhooks';
import { createAccountKeyManager } from 'corsair/core';
import { createCorsairDatabase } from 'corsair/db';
import { executeAutomationPrompt } from '@/server/services/automation-executor';
import { getNextRunTime } from '@/server/lib/cron-utils';

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
      const listRes = await tenant.gmail.api.messages.list({ maxResults: 20 }).catch(() => null);
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

export const executeAutomation = inngest.createFunction(
  {
    id: 'execute-automation',
    name: 'Execute Automation',
    concurrency: {
      limit: 2,
      key: 'event.data.tenantId',
    },
    triggers: [{ event: 'automation.execute' }],
  },
  async ({ event, step }) => {
    const { automationId, tenantId, triggerType } = event.data as {
      automationId: string;
      tenantId: string;
      triggerType?: string;
    };

    // Step 1: Query automation and initialize run record
    const runInfo = await step.run('initialize-run', async () => {
      const item = await db.query.automations.findFirst({
        where: and(eq(automations.id, automationId), eq(automations.tenantId, tenantId)),
      });
      if (!item) {
        throw new Error(`Automation ${automationId} not found for tenant ${tenantId}`);
      }

      const runId = crypto.randomUUID();
      await db.insert(automationRuns).values({
        id: runId,
        automationId,
        tenantId,
        status: 'running',
        modelUsed: item.model,
        startedAt: new Date(),
      });

      return {
        runId,
        name: item.name,
        prompt: item.prompt,
        model: item.model,
        schedule: item.schedule,
        timezone: item.timezone,
      };
    });

    // Step 2: Execute AI prompt and tool pipelines
    const aiResult = await step.run('run-ai-pipeline', async () => {
      return await executeAutomationPrompt({
        tenantId,
        automationName: runInfo.name,
        prompt: runInfo.prompt,
        model: runInfo.model,
        timezone: runInfo.timezone,
      });
    });

    // Step 3: Update run record and calculate next schedule
    await step.run('finalize-run-and-schedule', async () => {
      await db
        .update(automationRuns)
        .set({
          status: aiResult.success ? 'succeeded' : 'failed',
          resultTitle: aiResult.title,
          resultContent: aiResult.content,
          modelUsed: aiResult.modelUsed,
          durationMs: aiResult.durationMs,
          error: aiResult.error ?? null,
          completedAt: new Date(),
        })
        .where(eq(automationRuns.id, runInfo.runId));

      const nextRunAt = getNextRunTime(runInfo.schedule, runInfo.timezone);

      await db
        .update(automations)
        .set({
          lastRunAt: new Date(),
          nextRunAt,
          updatedAt: new Date(),
        })
        .where(eq(automations.id, automationId));
    });

    return {
      success: aiResult.success,
      runId: runInfo.runId,
      durationMs: aiResult.durationMs,
    };
  }
);

export const pollDueAutomations = inngest.createFunction(
  {
    id: 'poll-due-automations',
    name: 'Poll Due Automations',
    triggers: [{ cron: '*/5 * * * *' }], // Runs every 5 minutes
  },
  async ({ step }) => {
    const dueAutomations = await step.run('query-due-automations', async () => {
      const now = new Date();
      return await db.query.automations.findMany({
        where: and(
          eq(automations.status, 'active'),
          lte(automations.nextRunAt, now)
        ),
        limit: 50,
      });
    });

    if (!dueAutomations.length) {
      return { dispatched: 0 };
    }

    const events = dueAutomations.map((a) => ({
      name: 'automation.execute' as const,
      data: {
        automationId: a.id,
        tenantId: a.tenantId,
        triggerType: 'scheduled',
      },
    }));

    await step.run('dispatch-automation-events', async () => {
      // Advance nextRunAt immediately to prevent double-dispatch in next poll interval
      for (const a of dueAutomations) {
        const next = getNextRunTime(a.schedule, a.timezone);
        await db
          .update(automations)
          .set({ nextRunAt: next, updatedAt: new Date() })
          .where(eq(automations.id, a.id));
      }

      await inngest.send(events);
    });

    return { dispatched: dueAutomations.length };
  }
);

