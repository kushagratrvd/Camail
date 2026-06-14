import { processWebhook } from 'corsair';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { corsair } from '@/server/corsair';
import { getTenantId } from '@/server/lib/tenant';

export async function POST(request: NextRequest) {
	const headers: Record<string, string> = {};
	request.headers.forEach((value, key) => {
		headers[key] = value;
	});

	const contentType = request.headers.get('content-type');

	let body: string | Record<string, unknown>;

	if (contentType?.includes('application/json')) {
		body = await request.json();
	} else {
		const text = await request.text();
		body = text && text.trim() ? text : {};
	}

	const tenantId = getTenantId();

	processWebhook(corsair, headers, body, { tenantId })
		.then((result) => {
			console.info('Plugin Processed:', result.plugin, result.action);
		})
		.catch((err) => {
			console.error('Webhook processing error:', err);
		});

	return new NextResponse(null, { status: 200 });
}

export async function GET() {
	return NextResponse.json({
		status: 'ok',
		message: 'Webhook endpoint is active',
		timestamp: new Date().toISOString(),
	});
}
