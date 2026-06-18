import { calendarRouter } from "@/server/api/routers/calendar";
import { gmailRouter } from "@/server/api/routers/gmail";
import { activityRouter } from "@/server/api/routers/activity";
import { chatRouter } from "@/server/api/routers/chat";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  gmail: gmailRouter,
  calendar: calendarRouter,
  activity: activityRouter,
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
