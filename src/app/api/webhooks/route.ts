import { corsair } from '@/server/corsair';
import { GooglePubSubMessageSchema, GmailWatchPayloadSchema } from '@/server/lib/schemas';
import { processWebhook } from 'corsair';
import { decryptTenantId } from '@/server/lib/crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { users } from '@/server/db/auth-schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';

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
		const pubSubParsed = GooglePubSubMessageSchema.safeParse(body);
		if (pubSubParsed.success) {
			try {
				const decoded = Buffer.from(pubSubParsed.data.message.data, 'base64').toString('utf-8');
				const payloadParsed = GmailWatchPayloadSchema.safeParse(JSON.parse(decoded));
				if (payloadParsed.success) {
					const user = await db.query.users.findFirst({
						where: eq(users.email, payloadParsed.data.emailAddress)
					});
					if (user) {
						tenantId = user.id;
					}
				}
			} catch (e) {
				console.error('[Webhooks] Failed to decode or validate webhook payload', e);
			}
		}
	}

    try {
        await inngest.send({
            name: 'gmail.webhook.received',
            data: {
                activeTenantId: tenantId,
                headersObj: headers,
                body: body
            }
        });
    } catch (e) {
        console.error(`[Webhooks] Error forwarding webhook to Inngest:`, e);
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
