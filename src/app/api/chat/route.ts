import { streamText, type UIMessage, convertToModelMessages, stepCountIs, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { buildCorsairToolDefs } from '@corsair-dev/mcp';
import { corsair } from '@/server/corsair';
import { getTenantId, getTenant } from '@/server/lib/tenant';
import { validateScriptSafety, validatePromptSafety, validateRestrictedOperations, enforceAiQuota } from '@/server/lib/quota';
import { z } from 'zod';
import { auth } from '@/server/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { corsairChats, corsairAccounts, corsairIntegrations } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { ChatRequestSchema } from '@/server/lib/schemas';
import { getDecryptedKeys } from '@/server/services/api-keys';
import { buildSystemPrompt } from '@/server/lib/prompt-builder';
import { sendEmail, sendEmailWithToken, getGmailAccessToken, replyToMessage, createDraft } from '@/server/lib/gmail-helpers';

function getModelInstance(
  modelString: string,
  keys: { google?: string; openai?: string; anthropic?: string }
) {
  const [provider, modelName] = modelString.split('/');
  if (!provider || !modelName) {
    throw new Error(`Invalid model format: ${modelString}`);
  }

  switch (provider) {
    case 'google': {
      const apiKey = keys.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('Missing Google Gemini API Key');
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      return googleProvider(modelName);
    }
    case 'openai': {
      const apiKey = keys.openai || process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error('Missing OpenAI API Key');
      const openaiProvider = createOpenAI({ apiKey });
      return openaiProvider(modelName);
    }
    case 'anthropic': {
      const apiKey = keys.anthropic || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('Missing Anthropic API Key');
      const anthropicProvider = createAnthropic({ apiKey });
      return anthropicProvider(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export const maxDuration = 300;

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { messages, model, instructions, timezone } = parsed.data;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userName = session?.user?.name || 'User';

  const tenantId = await getTenantId();
  if (!tenantId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch API keys from service layer (decrypted server-side)
  const keys = await getDecryptedKeys(tenantId);

  const [provider] = model.split('/');
  const hasCustomKey = keys && !!keys[provider as keyof typeof keys];
  if (!hasCustomKey) {
    await enforceAiQuota(tenantId);
  }

  const syncedCorsair = await getTenant();

  const corsairToolDefs = buildCorsairToolDefs({ 
    corsair: syncedCorsair as unknown as Parameters<typeof buildCorsairToolDefs>[0]['corsair'],
    tenantId,
    setup: false,
  });

  const aiTools: NonNullable<Parameters<typeof streamText>[0]['tools']> = {};
  const SKIP_TOOLS = new Set(['list_operations', 'corsair_setup']);
  for (const t of corsairToolDefs) {
    if (SKIP_TOOLS.has(t.name)) continue;
    aiTools[t.name] = tool({
      description: t.description,
      inputSchema: z.object(t.shape as z.ZodRawShape),
      execute: async (args: Record<string, unknown>) => {
        if (t.name === 'run_script') {
          if (typeof args.script === 'string' && !args.code) {
            args.code = args.script;
            delete args.script;
          }
          if (typeof args.code === 'string') {
            validateScriptSafety(args.code);
            validateRestrictedOperations(args.code);

            const trimmed = args.code.trim();
            const arrowRegex = /^(?:\(?\s*async\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\)?);?$/;
            const functionRegex = /^(?:\(?\s*async\s*function\s*\(\s*\)\s*\{([\s\S]*)\}\s*\)?);?$/;

            if (arrowRegex.test(trimmed)) {
              args.code = trimmed.replace(arrowRegex, '$1');
            } else if (functionRegex.test(trimmed)) {
              args.code = trimmed.replace(functionRegex, '$1');
            }
          }
        }
        const finalArgs = { ...args, tenantId };
        try {
          const res = (await t.handler(finalArgs as Parameters<typeof t.handler>[0])) as Record<string, unknown>;
          if (res && typeof res === 'object' && res.error) {
            console.error(`[Corsair Tool Error ${t.name}]`, res.error);
            return { success: false, error: String(res.error) };
          }
          return res;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[Corsair Tool Exception ${t.name}]`, errMsg);
          return { success: false, error: errMsg };
        }
      }
    });
  }

  try {
    const safeMessages = (messages as UIMessage[]).filter((m) => m.role !== 'system');
    
    const lastUserMessage = [...safeMessages].reverse().find((m) => m.role === 'user');
    const content = (lastUserMessage as any)?.content;
    if (typeof content === 'string') {
      validatePromptSafety(content);
    }
    
    const modelInstance = getModelInstance(model, keys);

    // Limit context window sent to LLM to the last 16 messages to reduce latency/cost.
    // We adjust the start index forward to a 'user' message to avoid orphaned tool calls/results.
    const MAX_CONTEXT_MESSAGES = 16;
    let startIndex = Math.max(0, safeMessages.length - MAX_CONTEXT_MESSAGES);
    while (startIndex < safeMessages.length && safeMessages[startIndex]?.role !== 'user') {
      startIndex++;
    }
    if (startIndex >= safeMessages.length) {
      startIndex = Math.max(0, safeMessages.length - 1);
    }
    const contextMessages = safeMessages.slice(startIndex);

    const userAccounts = await db.query.corsairAccounts.findMany({
      where: eq(corsairAccounts.tenantId, tenantId),
    });
    const userIntegrations = await db.query.corsairIntegrations.findMany();
    const integrationMap = new Map(userIntegrations.map((i) => [i.id, i.name]));

    const gmailAcc = userAccounts.find((a) => integrationMap.get(a.integrationId) === 'gmail');
    const calAcc = userAccounts.find((a) => integrationMap.get(a.integrationId) === 'googlecalendar');

    // Auto-backfill accountEmail if missing in DB for Gmail account
    if (gmailAcc && !gmailAcc.accountEmail) {
      const fallbackEmail = session?.user?.email ?? null;
      if (fallbackEmail) {
        gmailAcc.accountEmail = fallbackEmail;
        db.update(corsairAccounts)
          .set({ accountEmail: fallbackEmail, updatedAt: new Date() })
          .where(eq(corsairAccounts.id, gmailAcc.id))
          .catch((e) => console.warn('[Chat API] Failed to auto-backfill accountEmail:', e));
      }
    }

    const gmailStatus = gmailAcc?.status || 'DISCONNECTED';
    const calStatus = calAcc?.status || 'DISCONNECTED';

    // Extract last user message text for conditional prompt section injection
    const lastUserText = (() => {
      if (!lastUserMessage) return '';
      const msg = lastUserMessage as any;
      // Try parts first (Vercel AI SDK UIMessage format)
      if (Array.isArray(msg.parts)) {
        return msg.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text ?? '')
          .join(' ');
      }
      // Fallback to content string / array
      if (typeof msg.content === 'string') return msg.content;
      if (Array.isArray(msg.content)) return msg.content.map((p: any) => p?.text ?? '').join(' ');
      return '';
    })();

    // Register dedicated send/reply tools so the LLM never touches MIME or base64
    const gmailConnected = gmailStatus === 'CONNECTED' || gmailStatus === 'SYNCING';
    const senderEmail = gmailAcc?.accountEmail || session?.user?.email || null;
    console.log(`[Chat API] Gmail status: ${gmailStatus}, accountEmail: ${gmailAcc?.accountEmail ?? 'none'}, sessionEmail: ${session?.user?.email ?? 'none'}, senderEmail: ${senderEmail ?? 'none'}, tools registered: ${gmailConnected && !!senderEmail}`);
    if (gmailConnected && senderEmail) {
      const fromHeader = `${userName} <${senderEmail}>`;

      aiTools['send_email'] = tool({
        description: `Send an email to one or more recipients.
- When 'to' is an array, this sends ONE SEPARATE EMAIL to EACH address in a single tool call.
- Sending to ["a@x.com", "a@x.com", "a@x.com"] sends 3 separate emails to the same person.
- You can send 30, 50, 100 emails in ONE call by passing all addresses in the array.
- Use this for bulk sending: pass all 30, 50, or 100 addresses in a single call.
- This is a single tool call regardless of how many recipients are in the array.`,
        inputSchema: z.object({
          to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address or array of recipient email addresses'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Plain text email body'),
        }),
        execute: async ({ to, subject, body }) => {
          try {
            const recipients = Array.isArray(to) ? to : [to];
            console.log(`[send_email] Attempting to send email to ${recipients.length} recipient(s):`, recipients);

            let accessToken: string;
            try {
              accessToken = await getGmailAccessToken(tenantId);
              console.log(`[send_email] Got access token — length: ${accessToken.length}`);
            } catch (tokenErr) {
              const tokenMsg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
              console.error('[send_email] Token fetch failed:', tokenMsg);
              return { success: false, error: `Auth error: ${tokenMsg}` };
            }

            const results = await Promise.allSettled(
              recipients.map((recipient) =>
                sendEmailWithToken({ accessToken, from: fromHeader, to: recipient, subject, body })
              )
            );

            const sent = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

            failed.forEach((f, i) => {
              const reasonMsg = f.reason instanceof Error ? f.reason.message : String(f.reason);
              console.error(`[send_email] Recipient #${i + 1} failed:`, reasonMsg);
            });

            console.log(`[send_email] Bulk send completed — total: ${recipients.length}, sent: ${sent}, failed: ${failed.length}`);

            if (recipients.length === 1) {
              if (results[0]?.status === 'fulfilled') {
                return { success: true };
              } else {
                const reason = (results[0] as PromiseRejectedResult).reason;
                const msg = reason instanceof Error ? reason.message : String(reason);
                console.error('[send_email] Single send failed:', msg);
                return { success: false, error: msg };
              }
            }

            const firstFailedReason = failed[0]?.reason instanceof Error ? failed[0].reason.message : String(failed[0]?.reason ?? '');

            return {
              success: failed.length === 0,
              sent,
              failed: failed.length,
              total: recipients.length,
              ...(failed.length > 0 ? { error: `Failed to send to ${failed.length}/${recipients.length} recipients. First error: ${firstFailedReason}` } : {}),
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[send_email] Unexpected error:', msg);
            return { success: false, error: msg };
          }
        },
      });

      aiTools['reply_to_message'] = tool({
        description: 'Reply to an existing email thread. Thread headers (In-Reply-To, References, threadId) are handled automatically.',
        inputSchema: z.object({
          originalMessageId: z.string().describe('The Gmail message ID to reply to'),
          body: z.string().describe('Plain text reply body'),
        }),
        execute: async ({ originalMessageId, body }) => {
          try {
            return await replyToMessage({ tenantId, from: fromHeader, originalMessageId, body });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[reply_to_message Error]', msg);
            return { success: false, error: msg };
          }
        },
      });

      aiTools['create_draft'] = tool({
        description: 'Create a draft email without sending it. Pass to, subject, and body as plain text.',
        inputSchema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Plain text email body'),
        }),
        execute: async ({ to, subject, body }) => {
          try {
            return await createDraft({ tenantId, from: fromHeader, to, subject, body });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[create_draft Error]', msg);
            return { success: false, error: msg };
          }
        },
      });
    }

    const systemPrompt = buildSystemPrompt({
      userName,
      timezone: timezone || 'Asia/Kolkata',
      gmailStatus,
      gmailEmail: senderEmail,
      calStatus,
      calEmail: calAcc?.accountEmail ?? null,
      instructions,
      lastMessage: lastUserText,
    });

    console.log('[Chat API] Context messages count:', contextMessages.length);
    console.log('[Chat API] Context messages roles:', contextMessages.map((m: any) => m.role));

    let convertedMessages;
    try {
      convertedMessages = await convertToModelMessages(contextMessages);
      console.log('[Chat API] Converted messages count:', convertedMessages.length);
      console.log('[Chat API] Converted messages:', JSON.stringify(convertedMessages, null, 2));
    } catch (err) {
      console.error('[Chat API] convertToModelMessages failed:', err);
      throw err;
    }

    const result = streamText({
      model: modelInstance,
      messages: convertedMessages,
      tools: aiTools,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
      maxRetries: 0,
      onStepFinish: ({ toolCalls, toolResults, text, finishReason }) => {
        console.log(`[streamText Step] finishReason: ${finishReason}, toolCalls: ${toolCalls?.length ?? 0}, toolResults: ${toolResults?.length ?? 0}, textLength: ${text?.length ?? 0}`);
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((tc: any) => console.log(`[streamText ToolCall] Name: ${tc.toolName}, Args:`, JSON.stringify(tc.input ?? tc.args)));
        }
        if (toolResults && toolResults.length > 0) {
          toolResults.forEach((tr: any) => console.log(`[streamText ToolResult] Name: ${tr.toolName}, Result:`, JSON.stringify(tr.result)));
        }
      },
      onError: ({ error }) => {
        console.error('[Stream Execution Error] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat API Error]', error);

    const e = error as Record<string, unknown>;
    const errorMessage = typeof e?.message === 'string' ? e.message : String(error);
    const lastError = e?.lastError as Record<string, unknown> | undefined;

    const isSafetyError = errorMessage.includes('Safety Violation');
    const isQuotaViolation = errorMessage.includes('Quota Violation');
    const isMissingKey = errorMessage.includes('Missing') && errorMessage.includes('API Key');
    const isInvalidKey = errorMessage.includes('invalid_api_key') || errorMessage.includes('API key not valid') || errorMessage.includes('Incorrect API key');
    const isQuotaError = isQuotaViolation
      || e?.statusCode === 429
      || lastError?.statusCode === 429
      || errorMessage.includes('quota')
      || errorMessage.includes('Quota')
      || errorMessage.includes('RESOURCE_EXHAUSTED')
      || errorMessage.includes('rate-limit')
      || errorMessage.includes('rate_limit');

    let message: string;
    let status = 500;

    if (isSafetyError) {
      message = `⚠️ ${errorMessage}`;
      status = 400;
    } else if (isQuotaViolation) {
      message = `⚠️ ${errorMessage}`;
      status = 429;
    } else if (isMissingKey || isInvalidKey) {
      message = `⚠️ API Key Error: ${errorMessage}. Please configure your API key in Settings.`;
      status = 401;
    } else if (isQuotaError) {
      message = `⚠️ API rate limit or quota exceeded for ${model}. Please wait a minute or configure your own API key in Settings.`;
      status = 429;
    } else {
      message = `❌ ${errorMessage || 'Something went wrong. Please try again.'}`;
    }

    return new Response(message, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
