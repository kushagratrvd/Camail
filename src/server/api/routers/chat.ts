import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { corsairChats } from "@/server/db/schema";
import { getTenantId } from "@/server/lib/tenant";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { type UIMessage } from "ai";
import { z } from "zod";

export const chatRouter = createTRPCRouter({
  getChats: publicProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantId();
    if (!tenantId) return [];
    
    return ctx.db
      .select({
        id: corsairChats.id,
        title: corsairChats.title,
        updatedAt: corsairChats.updatedAt,
      })
      .from(corsairChats)
      .where(eq(corsairChats.tenantId, tenantId))
      .orderBy(corsairChats.updatedAt);
  }),

  getChatHistory: publicProcedure
    .input(z.object({ chatId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!input.chatId) return [];

      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be signed in to view chat history.",
        });
      }

      const chat = await ctx.db
        .select()
        .from(corsairChats)
        .where(eq(corsairChats.id, input.chatId))
        .limit(1);

      if (chat.length === 0 || chat[0].tenantId !== tenantId) {
        return [];
      }

      return (chat[0].messages as unknown as UIMessage[]) || [];
    }),

  saveChatHistory: publicProcedure
    .input(z.object({
      chatId: z.string(),
      messages: z.array(z.unknown()),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) return;

      const existingChat = await ctx.db
        .select()
        .from(corsairChats)
        .where(eq(corsairChats.id, input.chatId))
        .limit(1);

      if (existingChat.length > 0 && existingChat[0].tenantId === tenantId) {
        await ctx.db
          .update(corsairChats)
          .set({ 
            messages: input.messages, 
            updatedAt: new Date(),
            ...(input.title ? { title: input.title } : {})
          })
          .where(eq(corsairChats.id, input.chatId));
      } else if (existingChat.length === 0) {
        await ctx.db.insert(corsairChats).values({
          id: input.chatId,
          tenantId,
          title: input.title || 'New Chat',
          messages: input.messages,
        });
      }
    }),

  deleteChat: publicProcedure
    .input(z.object({ chatId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) return;

      await ctx.db
        .delete(corsairChats)
        .where(eq(corsairChats.id, input.chatId));
    }),
});
