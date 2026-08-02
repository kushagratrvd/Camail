import { createAccountKeyManager, createIntegrationKeyManager } from 'corsair/core';
import { createCorsairDatabase } from 'corsair/db';
import { conn } from '@/server/db';

export async function getGmailAccessToken(tenantId: string): Promise<string> {
  const kek = process.env.CORSAIR_KEK;
  if (!kek) {
    console.error('[gmail-helpers] CORSAIR_KEK not set in process.env');
    throw new Error('CORSAIR_KEK not set');
  }
  try {
    const database = createCorsairDatabase(conn);
    const km = createAccountKeyManager({ authType: 'oauth_2', integrationName: 'gmail', tenantId, kek, database });

    const [accessToken, expiresAtStr, refreshToken] = await Promise.all([
      km.get_access_token().catch(() => null),
      km.get_expires_at().catch(() => null),
      km.get_refresh_token().catch(() => null),
    ]);

    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = expiresAtStr ? Number(expiresAtStr) : 0;

    // If token exists and is valid for at least 5 more minutes, use it as-is
    if (accessToken && expiresAt > nowSec + 300) {
      console.log(`[gmail-helpers] Using cached valid access token (length: ${accessToken.length}, expires in ${expiresAt - nowSec}s)`);
      return accessToken;
    }

    // Token is missing or expired — refresh it if we have a refresh token
    if (refreshToken) {
      console.log('[gmail-helpers] Access token expired or missing. Refreshing via Google OAuth token endpoint...');
      const intKm = createIntegrationKeyManager({ authType: 'oauth_2', integrationName: 'gmail', kek, database });
      const [clientId, clientSecret] = await Promise.all([
        intKm.get_client_id().catch(() => null),
        intKm.get_client_secret().catch(() => null),
      ]);

      if (clientId && clientSecret) {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { access_token: string; expires_in: number };
          if (data.access_token) {
            const newExpiresAt = nowSec + data.expires_in;
            await Promise.all([
              km.set_access_token(data.access_token),
              km.set_expires_at(String(newExpiresAt)),
            ]);
            console.log(`[gmail-helpers] Successfully refreshed access token! New token length: ${data.access_token.length}, expires in ${data.expires_in}s`);
            return data.access_token;
          }
        } else {
          const errText = await res.text().catch(() => '');
          console.error('[gmail-helpers] OAuth refresh failed:', res.status, errText);
        }
      } else {
        console.error('[gmail-helpers] Missing client_id or client_secret for token refresh');
      }
    }

    if (!accessToken) {
      console.error(`[gmail-helpers] Gmail access token returned null/empty for tenantId: ${tenantId}`);
      throw new Error('Gmail access token not available');
    }

    console.log(`[gmail-helpers] Falling back to current access token (length: ${accessToken.length}) for tenantId: ${tenantId}`);
    return accessToken;
  } catch (err) {
    console.error(`[gmail-helpers] getGmailAccessToken failed for tenantId ${tenantId}:`, err);
    throw err;
  }
}

export async function sendEmailWithToken({
  accessToken,
  from,
  to,
  subject,
  body,
}: {
  accessToken: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  console.log(`[gmail-helpers] sendEmailWithToken called — to: ${to}, from: ${from}`);

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
  });

  console.log(`[gmail-helpers] Gmail API response for ${to} — status: ${res.status} ${res.statusText}`);

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error');
    console.error(`[gmail-helpers] Gmail API send error for ${to}:`, errText);
    throw new Error(`Gmail send failed: ${errText}`);
  }

  return { success: true };
}

export async function sendEmail(opts: {
  tenantId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  const accessToken = await getGmailAccessToken(opts.tenantId);
  return sendEmailWithToken({ ...opts, accessToken });
}

export async function replyToMessage({
  tenantId,
  from,
  originalMessageId,
  body,
}: {
  tenantId: string;
  from: string;
  originalMessageId: string;
  body: string;
}) {
  const accessToken = await getGmailAccessToken(tenantId);

  // Fetch original message to extract thread headers
  const origRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${originalMessageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!origRes.ok) throw new Error('Failed to fetch original message for reply');
  const orig = await origRes.json() as {
    threadId: string;
    payload: { headers: { name: string; value: string }[] };
  };

  const get = (name: string) =>
    orig.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  const to = get('From');
  const subjectRaw = get('Subject');
  const subject = subjectRaw.toLowerCase().startsWith('re:') ? subjectRaw : `Re: ${subjectRaw}`;
  const messageId = get('Message-Id');

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageId}`,
    `References: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: Buffer.from(mime).toString('base64url'),
      threadId: orig.threadId,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error');
    throw new Error(`Gmail reply failed: ${err}`);
  }

  return { success: true };
}

export async function createDraft({
  tenantId,
  from,
  to,
  subject,
  body,
}: {
  tenantId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}) {
  const accessToken = await getGmailAccessToken(tenantId);

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw: Buffer.from(mime).toString('base64url') },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error');
    throw new Error(`Gmail create draft failed: ${err}`);
  }

  const data = (await res.json()) as { id?: string };
  return { success: true, draftId: data.id };
}
