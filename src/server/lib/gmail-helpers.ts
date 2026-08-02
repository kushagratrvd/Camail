import { createAccountKeyManager } from 'corsair/core';
import { createCorsairDatabase } from 'corsair/db';
import { conn } from '@/server/db';

async function getGmailAccessToken(tenantId: string): Promise<string> {
  const kek = process.env.CORSAIR_KEK;
  if (!kek) throw new Error('CORSAIR_KEK not set');
  const database = createCorsairDatabase(conn);
  const km = createAccountKeyManager({ authType: 'oauth_2', integrationName: 'gmail', tenantId, kek, database });
  const token = await km.get_access_token();
  if (!token) throw new Error('Gmail access token not available');
  return token;
}

export async function sendEmail({
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

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown error');
    throw new Error(`Gmail send failed: ${err}`);
  }

  return { success: true };
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
