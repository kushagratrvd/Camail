import 'dotenv/config';
import { createCorsair } from 'corsair';
import { gmail } from '@corsair-dev/gmail';
import { googlecalendar } from '@corsair-dev/googlecalendar';
import { conn } from './db';
import { syncGoogleCredentialsFromEnv } from './lib/corsair-init';

export const corsair = createCorsair({
    plugins: [
        gmail({
            webhookHooks: {
                messageChanged: {
                    after: async (ctx, result) => {
                        console.log(`[WebhookHook - Gmail] Processing message for ${ctx.tenantId}`);
                        if (result.success && result.data) {
                            console.log(`Event type: ${result.data.type}`);
                            // Future: Push event via websockets to UI
                        } else {
                            console.log(`Webhook failed or returned no data: ${result.error}`);
                        }
                    }
                }
            }
        }),
        googlecalendar({
            webhookHooks: {
                onEventChanged: {
                    after: async (ctx, result) => {
                        console.log(`[WebhookHook - Calendar] Processing event for ${ctx.tenantId}`);
                        if (result.success && result.data) {
                            // 'event' is on 'eventCreated' and 'eventUpdated', but not 'eventDeleted'
                            const eventId = 'event' in result.data ? result.data.event?.id : result.data.eventId;
                            console.log(`Event type: ${result.data.type}, ID: ${eventId}`);
                            // Future: Push event via websockets to UI
                        } else {
                            console.log(`Webhook failed or returned no data: ${result.error}`);
                        }
                    }
                }
            }
        })
    ],
    database: conn,
    kek: process.env.CORSAIR_KEK!,
    multiTenancy: true,
});

let syncPromise: Promise<void> | null = null;
export function ensureCredentialsSynced(): Promise<void> {
    if (!syncPromise) {
        syncPromise = syncGoogleCredentialsFromEnv().catch((err) => {
            syncPromise = null;
            throw err;
        });
    }
    return syncPromise;
}

// Kick it off immediately
ensureCredentialsSynced().catch(console.error);