import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { corsairChats } from "@/server/db/schema";
import { getTenantId } from "@/server/lib/tenant";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { type Message } from "ai";

export const chatRouter = createTRPCRouter({
  getChatHistory: publicProcedure.query(async ({ ctx }) => {
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
      .where(eq(corsairChats.tenantId, tenantId))
      .limit(1);

    if (chat.length === 0) {
      return [];
    }

    // Return the messages array (cast to Message[] since it's JSONB)
    return (chat[0].messages as unknown as Message[]) || [];
  }),
});
