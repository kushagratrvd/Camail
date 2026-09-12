import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { getTenantId } from '@/server/lib/tenant';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { db } from '@/server/db';
import { automations, automationRuns } from '@/server/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { getNextRunTime, formatCronLabel } from '@/server/lib/cron-utils';
import { getKeyStatus } from '@/server/services/api-keys';
import { inngest } from '@/inngest/client';
import { runAutomationTask } from '@/server/services/automation-executor';

export const automationsRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    const tenantId = await getTenantId();
    if (!tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
    }

    const items = await db.query.automations.findMany({
      where: eq(automations.tenantId, tenantId),
      orderBy: [desc(automations.createdAt)],
    });

    // Fetch run counts and latest run status per automation
    const runs = await db.query.automationRuns.findMany({
      where: eq(automationRuns.tenantId, tenantId),
      orderBy: [desc(automationRuns.createdAt)],
    });

    const runMap = new Map<string, { totalRuns: number; lastStatus: string | null; lastRunAt: Date | null }>();
    for (const run of runs) {
      const existing = runMap.get(run.automationId) || { totalRuns: 0, lastStatus: null, lastRunAt: null };
      existing.totalRuns++;
      if (!existing.lastStatus) {
        existing.lastStatus = run.status;
        existing.lastRunAt = run.completedAt || run.startedAt || run.createdAt;
      }
      runMap.set(run.automationId, existing);
    }

    return items.map((item) => {
      const stats = runMap.get(item.id) || { totalRuns: 0, lastStatus: null, lastRunAt: item.lastRunAt };
      return {
        ...item,
        totalRuns: stats.totalRuns,
        lastStatus: stats.lastStatus,
        lastRunAt: stats.lastRunAt || item.lastRunAt,
      };
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const item = await db.query.automations.findFirst({
        where: and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)),
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }

      const recentRuns = await db.query.automationRuns.findMany({
        where: and(eq(automationRuns.automationId, input.id), eq(automationRuns.tenantId, tenantId)),
        orderBy: [desc(automationRuns.createdAt)],
        limit: 10,
      });

      return {
        ...item,
        recentRuns,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(255),
        prompt: z.string().min(1, 'Prompt is required'),
        model: z.string().optional().default('google/gemini-2.5-flash'),
        schedule: z.string().min(1, 'Schedule is required'),
        scheduleLabel: z.string().optional(),
        timezone: z.string().optional().default('UTC'),
        icon: z.string().optional().default('Zap'),
      })
    )
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      // Check current user automations count for Free Tier limit (3 automations)
      const existingAutomations = await db.query.automations.findMany({
        where: eq(automations.tenantId, tenantId),
      });

      if (existingAutomations.length >= 3) {
        // Verify if user has added custom API keys to unlock unlimited automations
        const keyStatus = await getKeyStatus(tenantId);
        const hasCustomKey = keyStatus.google || keyStatus.openai || keyStatus.anthropic;

        if (!hasCustomKey) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message:
              'Free tier limit reached (maximum 3 automations). Add your own API key in Settings or upgrade to Pro for unlimited automations.',
          });
        }
      }

      const id = crypto.randomUUID();
      const tz = input.timezone || 'UTC';
      const nextRunAt = getNextRunTime(input.schedule, tz);
      const scheduleLabel = input.scheduleLabel || formatCronLabel(input.schedule);

      const [created] = await db
        .insert(automations)
        .values({
          id,
          tenantId,
          name: input.name.trim(),
          prompt: input.prompt.trim(),
          model: input.model,
          schedule: input.schedule.trim(),
          scheduleLabel,
          timezone: tz,
          status: 'active',
          icon: input.icon || 'Zap',
          nextRunAt,
        })
        .returning();

      return created;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        prompt: z.string().min(1).optional(),
        model: z.string().optional(),
        schedule: z.string().optional(),
        scheduleLabel: z.string().optional(),
        timezone: z.string().optional(),
        status: z.enum(['active', 'paused']).optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const existing = await db.query.automations.findFirst({
        where: and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }

      const updateData: Partial<typeof automations.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name.trim();
      if (input.prompt !== undefined) updateData.prompt = input.prompt.trim();
      if (input.model !== undefined) updateData.model = input.model;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.status !== undefined) updateData.status = input.status;

      const newSchedule = input.schedule !== undefined ? input.schedule.trim() : existing.schedule;
      const newTz = input.timezone !== undefined ? input.timezone : existing.timezone;

      if (input.schedule !== undefined || input.timezone !== undefined || input.status === 'active') {
        updateData.schedule = newSchedule;
        updateData.timezone = newTz;
        updateData.scheduleLabel = input.scheduleLabel || formatCronLabel(newSchedule);
        updateData.nextRunAt = getNextRunTime(newSchedule, newTz);
      } else if (input.status === 'paused') {
        updateData.nextRunAt = null;
      }

      updateData.updatedAt = new Date();

      const [updated] = await db
        .update(automations)
        .set(updateData)
        .where(and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)))
        .returning();

      return updated;
    }),

  toggleStatus: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const existing = await db.query.automations.findFirst({
        where: and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }

      const nextStatus = existing.status === 'active' ? 'paused' : 'active';
      const nextRunAt = nextStatus === 'active' ? getNextRunTime(existing.schedule, existing.timezone) : null;

      const [updated] = await db
        .update(automations)
        .set({
          status: nextStatus,
          nextRunAt,
          updatedAt: new Date(),
        })
        .where(and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)))
        .returning();

      return updated;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      await db
        .delete(automations)
        .where(and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)));

      return { success: true };
    }),

  runNow: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const item = await db.query.automations.findFirst({
        where: and(eq(automations.id, input.id), eq(automations.tenantId, tenantId)),
      });

      if (!item) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Automation not found.' });
      }

      // Dispatch event to Inngest for asynchronous background execution.
      // If Inngest is unreachable (e.g. local dev server not running), fall back gracefully to direct background execution.
      try {
        await inngest.send({
          name: 'automation.execute',
          data: {
            automationId: item.id,
            tenantId,
            triggerType: 'manual',
          },
        });
      } catch (inngestErr) {
        console.warn('[Inngest Dispatch Fallback] Inngest unreachable, running automation directly in background:', inngestErr);
        // Fire-and-forget background execution
        runAutomationTask(item.id, tenantId).catch((err) => {
          console.error('[Background Automation Execution Error]:', err);
        });
      }

      return { success: true, message: 'Automation execution queued.' };
    }),

  listRuns: publicProcedure
    .input(
      z.object({
        automationId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const allAutomations = await db.query.automations.findMany({
        where: eq(automations.tenantId, tenantId),
      });
      const automationMap = new Map(allAutomations.map((a) => [a.id, a]));

      const queryFilters = [eq(automationRuns.tenantId, tenantId)];
      if (input.automationId) {
        queryFilters.push(eq(automationRuns.automationId, input.automationId));
      }
      if (input.status) {
        queryFilters.push(eq(automationRuns.status, input.status));
      }

      const runs = await db.query.automationRuns.findMany({
        where: and(...queryFilters),
        orderBy: [desc(automationRuns.createdAt)],
        limit: input.limit,
      });

      return runs.map((r) => {
        const parent = automationMap.get(r.automationId);
        return {
          ...r,
          automationName: parent?.name || 'Deleted Automation',
          automationIcon: parent?.icon || 'Zap',
        };
      });
    }),

  getRunById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      const run = await db.query.automationRuns.findFirst({
        where: and(eq(automationRuns.id, input.id), eq(automationRuns.tenantId, tenantId)),
      });

      if (!run) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Run not found.' });
      }

      const parent = await db.query.automations.findFirst({
        where: eq(automations.id, run.automationId),
      });

      return {
        ...run,
        automationName: parent?.name || 'Automation',
        automationIcon: parent?.icon || 'Zap',
        scheduleLabel: parent?.scheduleLabel || null,
      };
    }),

  getStats: publicProcedure.query(async () => {
    const tenantId = await getTenantId();
    if (!tenantId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRuns = await db.query.automationRuns.findMany({
      where: and(
        eq(automationRuns.tenantId, tenantId),
        gte(automationRuns.createdAt, thirtyDaysAgo)
      ),
      orderBy: [desc(automationRuns.createdAt)],
    });

    // Build 30-day daily breakdown
    const dayMap = new Map<string, { date: string; succeeded: number; failed: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, succeeded: 0, failed: 0 });
    }

    for (const r of recentRuns) {
      const dateObj = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
      const key = dateObj.toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        if (r.status === 'succeeded') entry.succeeded++;
        else if (r.status === 'failed') entry.failed++;
      }
    }

    const dailyStats = Array.from(dayMap.values());
    const totalSucceeded = recentRuns.filter((r) => r.status === 'succeeded').length;
    const totalFailed = recentRuns.filter((r) => r.status === 'failed').length;

    return {
      totalSucceeded,
      totalFailed,
      totalRuns: recentRuns.length,
      dailyStats,
    };
  }),
});
