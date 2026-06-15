import { streamText, type UIMessage, convertToModelMessages, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { buildCorsairToolDefs } from '@corsair-dev/mcp';
import { corsair } from '@/server/corsair';
import { getTenantId, getTenant } from '@/server/lib/tenant';
import { z } from 'zod';

export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const tenantId = await getTenantId();
  if (!tenantId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const syncedCorsair = await getTenant();

  const corsairToolDefs = buildCorsairToolDefs({ 
    corsair: syncedCorsair as any,
    tenantId
  });

  const aiTools: Record<string, any> = {};
  for (const t of corsairToolDefs) {
    aiTools[t.name] = tool({
      description: t.description,
      parameters: z.object(t.shape as z.ZodRawShape),
      execute: async (args: any) => {
        const finalArgs = { ...args, tenantId };
        return await t.handler(finalArgs);
      }
    } as any);
  }

  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: await convertToModelMessages(messages),
    tools: aiTools,
    system: `You are a helpful AI assistant connected to the user's Gmail and Google Calendar via Corsair.
You can read emails, send emails, create calendar events, and more.
Always call the 'corsair_setup' tool first if you are unsure of the authentication status.
Then use 'list_operations' to find available tools.
Finally use 'run_script' to execute operations.
Keep your responses concise and friendly.`,
    stopWhen: stepCountIs(10),
  });

  return result.toUIMessageStreamResponse();
}
