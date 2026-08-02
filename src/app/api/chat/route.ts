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
import { sendEmail, replyToMessage, createDraft } from '@/server/lib/gmail-helpers';

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

    const gmailStatus = gmailAcc?.status || 'DISCONNECTED';
    const calStatus = calAcc?.status || 'DISCONNECTED';

    // Extract last user message text for conditional prompt section injection
    const lastUserText = (() => {
      const c = (lastUserMessage as any)?.content;
      if (typeof c === 'string') return c;
      if (Array.isArray(c)) return c.map((p: any) => p?.text ?? '').join(' ');
      return '';
    })();

    // Register dedicated send/reply tools so the LLM never touches MIME or base64
    const gmailConnected = gmailStatus === 'CONNECTED' || gmailStatus === 'SYNCING';
    const senderEmail = gmailAcc?.accountEmail || session?.user?.email || null;
    console.log(`[Chat API] Gmail status: ${gmailStatus}, accountEmail: ${gmailAcc?.accountEmail ?? 'none'}, sessionEmail: ${session?.user?.email ?? 'none'}, senderEmail: ${senderEmail ?? 'none'}, tools registered: ${gmailConnected && !!senderEmail}`);
    if (gmailConnected && senderEmail) {
      const fromHeader = `${userName} <${senderEmail}>`;

      aiTools['send_email'] = tool({
        description: 'Compose and send an email. Pass to, subject, and body as plain text — MIME is handled automatically. No confirmation needed.',
        inputSchema: z.object({
          to: z.string().describe('Recipient email address'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Plain text email body'),
        }),
        execute: async ({ to, subject, body }) => {
          return sendEmail({ tenantId, from: fromHeader, to, subject, body });
        },
      });

      aiTools['reply_to_message'] = tool({
        description: 'Reply to an existing email thread. Thread headers (In-Reply-To, References, threadId) are handled automatically.',
        inputSchema: z.object({
          originalMessageId: z.string().describe('The Gmail message ID to reply to'),
          body: z.string().describe('Plain text reply body'),
        }),
        execute: async ({ originalMessageId, body }) => {
          return replyToMessage({ tenantId, from: fromHeader, originalMessageId, body });
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
          return createDraft({ tenantId, from: fromHeader, to, subject, body });
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

    const result = streamText({
      model: modelInstance,
      messages: await convertToModelMessages(contextMessages),
      tools: aiTools,
      system: systemPrompt,
      stopWhen: stepCountIs(5),
      maxRetries: 0,
      onError: ({ error }) => {
        console.error('[Stream Execution Error]', error);
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
