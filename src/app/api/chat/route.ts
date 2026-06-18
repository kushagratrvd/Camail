import { streamText, type UIMessage, convertToModelMessages, stepCountIs, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { buildCorsairToolDefs } from '@corsair-dev/mcp';
import { corsair } from '@/server/corsair';
import { getTenantId, getTenant } from '@/server/lib/tenant';
import { validateScriptSafety } from '@/server/lib/quota';
import { z } from 'zod';
import { auth } from '@/server/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { corsairChats } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { ChatRequestSchema } from '@/server/lib/schemas';

function getModelInstance(
  modelString: string,
  keys: { google?: string; openai?: string; anthropic?: string; deepseek?: string }
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
    case 'deepseek': {
      const apiKey = keys.deepseek || process.env.DEEPSEEK_API_KEY;
      if (!apiKey) throw new Error('Missing DeepSeek API Key');
      const deepseekProvider = createOpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com/v1',
      });
      const mappedModelName = modelName === 'deepseek-v3.2' ? 'deepseek-chat' : modelName;
      return deepseekProvider(mappedModelName);
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

  const { messages, model, keys } = parsed.data;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userName = session?.user?.name || 'User';

  const tenantId = await getTenantId();
  if (!tenantId) {
    return new Response('Unauthorized', { status: 401 });
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
          }
        }
        const finalArgs = { ...args, tenantId };
        return await t.handler(finalArgs as Parameters<typeof t.handler>[0]);
      }
    });
  }

  try {
    const safeMessages = (messages as UIMessage[]).filter((m) => m.role !== 'system');
    
    const modelInstance = getModelInstance(model, keys);

    const result = streamText({
      model: modelInstance,
      messages: await convertToModelMessages(safeMessages),
      tools: aiTools,
      system: `You are a helpful AI assistant connected to the user's Gmail and Google Calendar via Corsair.
You can read emails, send emails, create calendar events, and more.

USER CONTEXT:
- The user's name is ${userName}. When writing emails on their behalf, ALWAYS sign off with their actual name (${userName}), not placeholders like "[your name]".
- The current exact date and time is ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}.
- The current year is ${new Date().getFullYear()}. When scheduling events for "tomorrow" or "next week", use this year unless specified otherwise.

IMPORTANT RULES:
- Your integrations are already configured. No setup is needed.
- Available Gmail operations: messages.list, messages.get, messages.send, messages.delete, messages.modify, messages.batchModify, messages.trash, messages.untrash, labels.list, labels.get, labels.create, labels.update, labels.delete, drafts.list, drafts.get, drafts.create, drafts.update, drafts.delete, drafts.send, threads.list, threads.get, threads.modify, threads.delete, threads.trash, threads.untrash.
- Available Calendar operations: events.create, events.get, events.getMany, events.update, events.delete, calendar.getAvailability.
- Assume UTC+5:30 (Asia/Kolkata) as default unless specified by the user. Always add the proper timezone indicator to any dates/times you generate for calendar events.
- Use 'run_script' to execute operations.
- CRITICAL FOR RUN_SCRIPT: If you want to read or fetch data, your script MUST explicitly use the \`return\` keyword at the top level (e.g. \`return await corsair.gmail.api...\`). Otherwise, it will return null!
- To list or fetch calendar events, you MUST use \`events.getMany\` (NOT events.list). Example: \`return await corsair.googlecalendar.api.events.getMany({ calendarId: 'primary', timeMin: new Date().toISOString() })\`
- For sending emails, Corsair's schema expects \`raw\` at the root level (NOT inside resource or requestBody). Example: \`corsair.gmail.api.messages.send({ userId: 'me', raw: Buffer.from(emailContent).toString('base64url') })\`
- For creating events, Corsair's schema expects the payload in \`event\`. Example: \`corsair.googlecalendar.api.events.create({ calendarId: 'primary', event: { summary: '...', start: { dateTime: '...' }, end: { dateTime: '...' } } })\`
- The run_script tool often returns "null" for write operations (e.g. sending an email). This is normal behavior — assume success for write operations (send, create, delete, modify) if they return null.
- NEVER retry the same tool call more than once. If a tool returns "null" or an unexpected result, inform the user and move on.
- Keep your responses concise and friendly.`,
      stopWhen: stepCountIs(5),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[Chat API Error]', error);

    const e = error as Record<string, unknown>;
    const errorMessage = typeof e?.message === 'string' ? e.message : '';
    const lastError = e?.lastError as Record<string, unknown> | undefined;

    const isQuotaError = e?.statusCode === 429
      || lastError?.statusCode === 429
      || errorMessage.includes('quota')
      || errorMessage.includes('RESOURCE_EXHAUSTED');

    const message = isQuotaError
      ? '⚠️ API rate limit exceeded. Please wait a minute and try again.'
      : '❌ Something went wrong. Please try again.';

    return new Response(
      message,
      { status: isQuotaError ? 429 : 500, headers: { 'Content-Type': 'text/plain' } }
    );
  }
}
