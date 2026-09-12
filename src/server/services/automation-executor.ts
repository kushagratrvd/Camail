import { generateText, tool, stepCountIs } from 'ai';
import { buildCorsairToolDefs } from '@corsair-dev/mcp';
import { corsair } from '@/server/corsair';
import { db } from '@/server/db';
import { corsairAccounts, corsairIntegrations, automations, automationRuns } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { getNextRunTime } from '@/server/lib/cron-utils';
import {
  validateScriptSafety,
  validatePromptSafety,
  validateRestrictedOperations,
  enforceAiQuota,
} from '@/server/lib/quota';
import { getDecryptedKeys } from '@/server/services/api-keys';
import { getModelInstance } from '@/server/lib/models';
import {
  sendEmailWithToken,
  getGmailAccessToken,
  replyToMessage,
} from '@/server/lib/gmail-helpers';
import { z } from 'zod';

export interface ExecuteAutomationParams {
  tenantId: string;
  automationName: string;
  prompt: string;
  model?: string;
  timezone?: string;
}

export interface AutomationExecutionResult {
  success: boolean;
  title: string;
  content: string;
  durationMs: number;
  modelUsed: string;
  error?: string;
}

export async function executeAutomationPrompt({
  tenantId,
  automationName,
  prompt,
  model = 'google/gemini-2.5-flash',
  timezone = 'UTC',
}: ExecuteAutomationParams): Promise<AutomationExecutionResult> {
  const startTime = Date.now();

  try {
    // 1. Safety validation on the automation prompt
    validatePromptSafety(prompt);

    // 2. Resolve API keys and enforce quota
    const keys = await getDecryptedKeys(tenantId);
    const [provider] = model.split('/');
    const hasCustomKey = keys && !!keys[provider as keyof typeof keys];

    if (!hasCustomKey) {
      await enforceAiQuota(tenantId);
    }

    // 3. Resolve Model instance
    const modelInstance = getModelInstance(model, keys);

    // 4. Resolve tenant Corsair instance
    const tenantCorsair = corsair.withTenant(tenantId);

    // 5. Query user's connected accounts
    const userAccounts = await db.query.corsairAccounts.findMany({
      where: eq(corsairAccounts.tenantId, tenantId),
    });
    const integrations = await db.query.corsairIntegrations.findMany();
    const integrationMap = new Map(integrations.map((i) => [i.id, i.name]));

    const gmailAcc = userAccounts.find((a) => integrationMap.get(a.integrationId) === 'gmail');
    const calAcc = userAccounts.find((a) => integrationMap.get(a.integrationId) === 'googlecalendar');

    const gmailConnected = gmailAcc?.status === 'CONNECTED';
    const calConnected = calAcc?.status === 'CONNECTED';
    const senderEmail = gmailAcc?.accountEmail || null;

    // 6. Build Corsair tools
    const corsairToolDefs = buildCorsairToolDefs({
      corsair: tenantCorsair as unknown as Parameters<typeof buildCorsairToolDefs>[0]['corsair'],
      tenantId,
      setup: false,
    });

    const aiTools: Record<string, any> = {};
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
              console.error(`[Automation Tool Error ${t.name}]`, res.error);
              return { success: false, error: String(res.error) };
            }
            return res;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(`[Automation Tool Exception ${t.name}]`, errMsg);
            return { success: false, error: errMsg };
          }
        },
      });
    }

    // 7. Dedicated Gmail tools (if connected)
    if (gmailConnected && senderEmail) {
      const fromHeader = `<${senderEmail}>`;

      aiTools['send_email'] = tool({
        description: 'Send an email to one or more recipients.',
        inputSchema: z.object({
          to: z.union([z.string(), z.array(z.string())]).describe('Recipient email address or array of recipient email addresses'),
          subject: z.string().describe('Email subject line'),
          body: z.string().describe('Plain text email body'),
        }),
        execute: async ({ to, subject, body }) => {
          try {
            const recipients = Array.isArray(to) ? to : [to];
            const accessToken = await getGmailAccessToken(tenantId);
            const results = await Promise.allSettled(
              recipients.map((recipient) =>
                sendEmailWithToken({ accessToken, from: fromHeader, to: recipient, subject, body })
              )
            );
            const sent = results.filter((r) => r.status === 'fulfilled').length;
            const failed = results.filter((r) => r.status === 'rejected');
            return {
              success: failed.length === 0,
              sent,
              failed: failed.length,
              total: recipients.length,
            };
          } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
          }
        },
      });

      aiTools['reply_to_message'] = tool({
        description: 'Reply to an existing email thread in Gmail.',
        inputSchema: z.object({
          originalMessageId: z.string().describe('The Gmail message ID to reply to'),
          body: z.string().describe('Plain text reply body'),
        }),
        execute: async ({ originalMessageId, body }) => {
          try {
            return await replyToMessage({ tenantId, from: fromHeader, originalMessageId, body });
          } catch (err: unknown) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
          }
        },
      });
    }

    // 8. Build Automation system prompt
    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'long',
      timeZone: timezone || 'UTC',
    }).format(now);

    const systemPrompt = `You are Camail's Autonomous Assistant executing a scheduled user automation.
Current Date & Time: ${formattedDate} (${timezone || 'UTC'}).

User Automation Name: "${automationName}"

Connected Services:
- Gmail: ${gmailConnected ? `Connected as ${senderEmail}` : 'Disconnected'}
- Google Calendar: ${calConnected ? `Connected as ${calAcc?.accountEmail ?? 'Active'}` : 'Disconnected'}

CRITICAL GUIDELINES:
1. Actively execute available tools to fulfill the user's instructions (e.g. search emails, list messages, inspect events).
2. For email searches, use Gmail search syntax (e.g. "newer_than:1d", "is:unread", "subject:...").
3. Deliver a comprehensive, beautifully formatted Markdown report containing:
   - Executive Summary / Highlights
   - Detailed Findings (with dates, senders, key items)
   - Action Items or Next Steps (if any)
4. If no relevant items were found, explicitly report that no matching emails/events were found during this run.
5. NEVER output raw JSON tool call artifacts in your final text. Produce human-readable, professional markdown.`;

    // 9. Execute with multi-step tool calls
    const { text } = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt,
      tools: aiTools,
      stopWhen: stepCountIs(8),
    });

    const durationMs = Date.now() - startTime;
    const dateLabel = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: timezone || 'UTC',
    }).format(now);

    return {
      success: true,
      title: `${automationName} — ${dateLabel}`,
      content: text || 'Automation completed successfully with no additional output.',
      durationMs,
      modelUsed: model,
    };
  } catch (err: unknown) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Automation Execution Failed] "${automationName}":`, errorMsg);
    return {
      success: false,
      title: `${automationName} (Failed)`,
      content: `### ❌ Execution Error\n\nThe automation failed with the following error:\n\n\`\`\`\n${errorMsg}\n\`\`\``,
      durationMs,
      modelUsed: model,
      error: errorMsg,
    };
  }
}

/**
 * Executes an automation directly in the background without depending on Inngest.
 * Used as a zero-config fallback when Inngest dev server is unreachable locally.
 */
export async function runAutomationTask(automationId: string, tenantId: string): Promise<void> {
  const item = await db.query.automations.findFirst({
    where: and(eq(automations.id, automationId), eq(automations.tenantId, tenantId)),
  });
  if (!item) {
    console.error(`[runAutomationTask] Automation ${automationId} not found for tenant ${tenantId}`);
    return;
  }

  const runId = crypto.randomUUID();
  await db.insert(automationRuns).values({
    id: runId,
    automationId,
    tenantId,
    status: 'running',
    modelUsed: item.model,
    startedAt: new Date(),
  });

  try {
    const aiResult = await executeAutomationPrompt({
      tenantId,
      automationName: item.name,
      prompt: item.prompt,
      model: item.model,
      timezone: item.timezone,
    });

    await db
      .update(automationRuns)
      .set({
        status: aiResult.success ? 'succeeded' : 'failed',
        resultTitle: aiResult.title,
        resultContent: aiResult.content,
        modelUsed: aiResult.modelUsed,
        durationMs: aiResult.durationMs,
        error: aiResult.error ?? null,
        completedAt: new Date(),
      })
      .where(eq(automationRuns.id, runId));

    const nextRunAt = getNextRunTime(item.schedule, item.timezone);
    await db
      .update(automations)
      .set({
        lastRunAt: new Date(),
        nextRunAt,
        updatedAt: new Date(),
      })
      .where(eq(automations.id, automationId));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(automationRuns)
      .set({
        status: 'failed',
        error: errorMsg,
        completedAt: new Date(),
      })
      .where(eq(automationRuns.id, runId));
  }
}
