import { NextRequest, NextResponse } from "next/server";
import { getTenantId } from "@/server/lib/tenant";
import { db, conn } from "@/server/db";
import { accounts } from "@/server/db/auth-schema";
import { eq, and } from "drizzle-orm";
import { ensureCredentialsSynced } from "@/server/corsair";
import { createCorsairDatabase } from "corsair/db";
import { createAccountKeyManager } from "corsair/core";
import { registerGoogleCalendarWebhook, registerGmailWebhook } from "@/server/lib/webhooks";
import * as crypto from "node:crypto";

export async function POST(req: NextRequest) {
    const tenantId = await getTenantId();
    if (!tenantId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        await ensureCredentialsSynced();
        const database = createCorsairDatabase(conn);

        for (const plugin of ['gmail', 'googlecalendar'] as const) {
            const integration = await database.db.selectFrom('corsair_integrations')
                .selectAll()
                .where('name', '=', plugin)
                .executeTakeFirst();

            if (integration) {
                const corsairAccount = await database.db.selectFrom('corsair_accounts')
                    .selectAll()
                    .where('tenant_id', '=', tenantId)
                    .where('integration_id', '=', integration.id)
                    .executeTakeFirst();

                if (!corsairAccount) {
                    const userAccount = await db.query.accounts.findFirst({
                        where: and(eq(accounts.userId, tenantId), eq(accounts.providerId, 'google'))
                    });

                    if (userAccount) {
                        console.log(`[Sync] Provisioning ${plugin} account for tenant:`, tenantId);
                        await database.db.insertInto('corsair_accounts').values({
                            id: crypto.randomUUID(),
                            tenant_id: tenantId,
                            integration_id: integration.id,
                            config: {},
                            created_at: new Date(),
                            updated_at: new Date()
                        }).execute();

                        const kek = process.env.CORSAIR_KEK;
                        if (kek) {
                            const km = createAccountKeyManager({
                                authType: 'oauth_2',
                                integrationName: plugin,
                                tenantId,
                                kek,
                                database
                            });

                            try {
                                await km.get_dek();
                            } catch {
                                await km.issue_new_dek();
                            }

                            if (userAccount.accessToken) {
                                await km.set_access_token(userAccount.accessToken);
                                if (plugin === 'googlecalendar') {
                                    await registerGoogleCalendarWebhook(userAccount.accessToken, tenantId);
                                } else if (plugin === 'gmail' && process.env.TOPIC_ID) {
                                    await registerGmailWebhook(userAccount.accessToken, tenantId, process.env.TOPIC_ID);
                                }
                            }
                            if (userAccount.refreshToken) {
                                await km.set_refresh_token(userAccount.refreshToken); 
                            }
                        }
                    }
                }
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Sync API Error]:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
