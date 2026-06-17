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

    let result: any = null;
    try {
      result = await step.run('run-process-webhook', async () => {
        const res = await processWebhook(corsair, headersObj, body, {
          tenantId: activeTenantId,
        });
        return res;
      });

      if (result?.plugin) {
        console.log(`[Inngest Webhook] Handled by ${result.plugin}.${result.action} for tenant ${activeTenantId}`);
      } else {
        console.warn(`[Inngest Webhook] Unmatched webhook received.`);
      }

    } catch (err: any) {
      const errMsg = String(err.message || err).toLowerCase();
      if (errMsg.includes('account not found') || errMsg.includes('make sure to create the account first')) {
        console.warn(`⚠️ [Inngest Webhook] Account not found for tenant ${activeTenantId}. User may have disconnected Gmail. Skipping.`);
        return { success: false, skipped: true, reason: 'account_not_found' };
      }
      throw err;
    }

    return { success: true, result };
  }
);
