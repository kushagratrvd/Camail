import crypto from 'node:crypto';
import { env } from '@/env';
import { encryptTenantId } from './crypto';

async function getBaseUrl(): Promise<string> {
	if (env.NODE_ENV === 'development') {
		try {
			const res = await fetch('http://127.0.0.1:4040/api/tunnels', { signal: AbortSignal.timeout(500) });
			if (res.ok) {
				const data = await res.json();
				const httpsTunnel = data.tunnels.find((t: any) => t.public_url.startsWith('https://'));
				if (httpsTunnel) {
					return httpsTunnel.public_url;
				}
			}
		} catch (e) {
		}
	}
	
	if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
	return env.BETTER_AUTH_URL.replace(/\/api\/auth\/?$/, '');
}

export async function registerGoogleCalendarWebhook(accessToken: string, tenantId: string) {
	try {
		const encryptedTenantId = encryptTenantId(tenantId);
		const baseUrl = await getBaseUrl();
		const webhookUrl = `${baseUrl}/api/webhooks?tenantId=${encryptedTenantId}`;
		
		const channelId = crypto.randomUUID();
		const calendarId = 'primary'; 
		const watchRes = await fetch(
			`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: channelId,
					type: 'web_hook',
					address: webhookUrl,
				}),
			}
		);

		if (!watchRes.ok) {
			const err = await watchRes.text();
			console.error(`[Webhooks] Calendar watch failed for tenant ${tenantId}:`, err);
			return null;
		}

		const data = (await watchRes.json()) as {
			id: string;
			resourceId: string;
			expiration: string;
		};

		const expiration = new Date(Number(data.expiration)).toISOString();
		console.log(`[Webhooks] Created Google Calendar watch for tenant ${tenantId}!`);
		console.log(`   - Channel ID: ${channelId}`);
		console.log(`   - Resource ID: ${data.resourceId}`);
		console.log(`   - Expiration: ${expiration}`);

		return data;
	} catch (error) {
		console.error(`[Webhooks] Failed to register Google Calendar webhook for tenant ${tenantId}:`, error);
		return null;
	}
}

export async function registerGmailWebhook(accessToken: string, tenantId: string, topicId: string) {
	try {
		const watchRes = await fetch(
			"https://gmail.googleapis.com/gmail/v1/users/me/watch",
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					topicName: topicId,
					labelIds: ['INBOX'],
				}),
			}
		);

		if (!watchRes.ok) {
			const err = await watchRes.text();
			console.error(`[Webhooks] Gmail watch failed for tenant ${tenantId}:`, err);
			return null;
		}

		const data = (await watchRes.json()) as {
			historyId: string;
			expiration: string;
		};

		const expiration = new Date(Number(data.expiration)).toISOString();
		console.log(`[Webhooks] Created Gmail watch for tenant ${tenantId}!`);
		console.log(`   - Topic: ${topicId}`);
		console.log(`   - History ID: ${data.historyId}`);
		console.log(`   - Expiration: ${expiration}`);

		return data;
	} catch (error) {
		console.error(`[Webhooks] Failed to register Gmail webhook for tenant ${tenantId}:`, error);
		return null;
	}
}
