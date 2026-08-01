import { NextRequest, NextResponse } from 'next/server';
import { processOAuthCallback } from 'corsair/oauth';
import { corsair, ensureCredentialsSynced } from '@/server/corsair';
import { db, conn } from '@/server/db';
import { corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { processIntegrationConnected } from '@/inngest/functions';
import { createAccountKeyManager } from 'corsair/core';
import { createCorsairDatabase } from 'corsair/db';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export async function GET(req: NextRequest) {
    await ensureCredentialsSynced();

    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    const expectedState = req.cookies.get('oauth_state')?.value;

    if (error) {
        return new NextResponse(
            `<html><body><h2>Authorization failed</h2><p>${escapeHtml(error)}</p></body></html>`, 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (!code || !state) {
        return new NextResponse(
            '<p>Missing code or state parameter.</p>', 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    if (state !== expectedState) {
        return new NextResponse(
            '<p>Invalid state. Possible CSRF attempt.</p>', 
            { status: 400, headers: { 'Content-Type': 'text/html' } }
        );
    }

    const REDIRECT_URI = new URL('/api/auth', req.nextUrl.origin).toString();

    try {
        const result = await processOAuthCallback(corsair, {
            code,
            state,
            redirectUri: REDIRECT_URI,
        });

        const tenantId = result.tenantId;
        const plugin = result.plugin;

        // Extract accountEmail from Google UserInfo API using newly issued token
        let accountEmail: string | null = null;
        const kek = process.env.CORSAIR_KEK;
        if (kek && tenantId && plugin) {
            try {
                const database = createCorsairDatabase(conn);
                const km = createAccountKeyManager({
                    authType: 'oauth_2',
                    integrationName: plugin,
                    tenantId,
                    kek,
                    database,
                });
                const accessToken = await km.get_access_token();
                if (accessToken) {
                    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken}` },
                    });
                    if (userInfoRes.ok) {
                        const userInfo = (await userInfoRes.json()) as { email?: string };
                        if (userInfo.email) {
                            accountEmail = userInfo.email;
                        }
                    }
                }
            } catch (e) {
                console.warn(`[OAuth Callback] Failed to fetch userinfo email for ${tenantId}:`, e);
            }
        }

        // Update corsairAccounts status to 'SYNCING' & store accountEmail
        const integration = await db.query.corsairIntegrations.findFirst({
            where: eq(corsairIntegrations.name, plugin),
        });

        if (integration && tenantId) {
            await db.update(corsairAccounts)
                .set({
                    status: 'SYNCING',
                    statusError: null,
                    ...(accountEmail ? { accountEmail } : {}),
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(corsairAccounts.tenantId, tenantId),
                        eq(corsairAccounts.integrationId, integration.id)
                    )
                );
        }

        // Trigger background setup processing directly for immediate resolution
        processIntegrationConnected(tenantId, plugin).catch((err) => {
            console.error(`[OAuth Callback] Background setup failed for ${tenantId} (${plugin}):`, err);
        });

        // Emit Inngest background event
        try {
            await inngest.send({
                name: 'integration.connected',
                data: {
                    tenantId,
                    plugin,
                },
            });
        } catch (e) {
            console.error(`[OAuth Callback] Failed to send Inngest integration.connected event:`, e);
        }

        const response = NextResponse.redirect(new URL(`/settings?connected=${encodeURIComponent(plugin)}`, req.nextUrl.origin));
        response.cookies.delete('oauth_state');
        return response;
        
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return new NextResponse(
            `<html><body><h2>OAuth error</h2><p>${escapeHtml(message)}</p></body></html>`, 
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
}
