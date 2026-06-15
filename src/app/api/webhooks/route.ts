import { corsair } from '@/server/corsair';
import { processWebhook } from 'corsair';
import { decryptTenantId } from '@/server/lib/crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
	const url = new URL(req.url);

	const encryptedTenantId = url.searchParams.get('tenantId');
	let tenantId = decryptTenantId(encryptedTenantId) || null;

	const headers = Object.fromEntries(req.headers);
	
	let body: string | Record<string, unknown> = {};
	if (req.headers.get('content-type')?.includes('application/json')) {
		body = await req.json();
	} else {
		const text = await req.text();
		body = text && text.trim() ? text : {};
	}

	if (!tenantId && body && typeof body === 'object') {
		if ('message' in body && body.message && typeof body.message === 'object' && 'data' in body.message) {
			try {
				const decoded = Buffer.from(body.message.data as string, 'base64').toString('utf-8');
				const payload = JSON.parse(decoded);
				if (payload.emailAddress) {
					const user = await db.query.users.findFirst({
						where: eq(users.email, payload.emailAddress)
					});
					if (user) {
						tenantId = user.id;
					}
				}
			} catch (e) {
				console.error('[Webhooks] Failed to decode webhook payload', e);
			}
		}
	}

    try {
        const result = await processWebhook(
            corsair,
            headers,
            body,
            tenantId ? { tenantId } : undefined
        );

        if (result.plugin) {
            console.log(`[Webhooks] Handled by ${result.plugin}.${result.action}`);
        } else {
            console.warn(`[Webhooks] Unmatched webhook received.`);
        }
    } catch (e: any) {
        if (e.message && e.message.includes('Account not found for tenant')) {
            // Silently ignore stale webhooks for deleted accounts to avoid log spam
        } else {
            console.error(`[Webhooks] Error processing webhook:`, e);
        }
    }

	return new NextResponse(null, { status: 200 });
}

export async function GET() {
	return NextResponse.json({
		status: 'ok',
		message: 'Webhook endpoint is active',
		timestamp: new Date().toISOString(),
	});
}
