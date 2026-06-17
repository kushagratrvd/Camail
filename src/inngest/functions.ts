import { inngest } from './client';
import { corsair } from '@/server/corsair';
import { processWebhook } from 'corsair';

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
