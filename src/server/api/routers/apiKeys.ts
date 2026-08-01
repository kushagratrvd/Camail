import { createTRPCRouter, publicProcedure } from '@/server/api/trpc';
import { getTenantId } from '@/server/lib/tenant';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import * as apiKeysService from '@/server/services/api-keys';

export const apiKeysRouter = createTRPCRouter({
  saveKeys: publicProcedure
    .input(
      z.object({
        google: z.string().optional(),
        openai: z.string().optional(),
        anthropic: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const userId = await getTenantId();
      if (!userId) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
      }

      await apiKeysService.saveKeys(userId, input);
      return { success: true as const };
    }),

  getKeyStatus: publicProcedure.query(async () => {
    const userId = await getTenantId();
    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
    }

    return apiKeysService.getKeyStatus(userId);
  }),

  deleteKeys: publicProcedure.mutation(async () => {
    const userId = await getTenantId();
    if (!userId) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
    }

    await apiKeysService.deleteKeys(userId);
    return { success: true as const };
  }),
});
