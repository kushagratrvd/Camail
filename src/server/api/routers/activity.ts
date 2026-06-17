import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { corsairEvents, corsairAccounts } from "@/server/db/schema";
import { getTenantId } from "@/server/lib/tenant";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const activityRouter = createTRPCRouter({
  getRecentEvents: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to view activity.",
        });
      }

      const accounts = await ctx.db
        .select({ id: corsairAccounts.id })
        .from(corsairAccounts)
        .where(eq(corsairAccounts.tenantId, tenantId));

      if (accounts.length === 0) {
        return { events: [], total: 0, totalPages: 0 };
      }

      const accountIds = accounts.map((a: { id: string }) => a.id);
      const offset = (input.page - 1) * input.limit;

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(corsairEvents)
        .where(inArray(corsairEvents.accountId, accountIds));
      
      const total = countResult ? Number(countResult.count) : 0;
      const totalPages = Math.ceil(total / input.limit);

      const events = await ctx.db
        .select()
        .from(corsairEvents)
        .where(inArray(corsairEvents.accountId, accountIds))
        .orderBy(desc(corsairEvents.createdAt))
        .limit(input.limit)
        .offset(offset);

      return {
        events,
        total,
        totalPages,
      };
    }),
});
