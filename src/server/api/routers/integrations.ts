import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { corsairAccounts, corsairEntities, corsairEvents, corsairWebhooks, corsairIntegrations } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantId } from "@/server/lib/tenant";
import { createAccountKeyManager } from "corsair/core";
import { createCorsairDatabase } from "corsair/db";
import { conn } from "@/server/db";

export type IntegrationStatus = "CONNECTED" | "SYNCING" | "RECONNECT_REQUIRED" | "DISCONNECTED" | "ERROR";

export const integrationsRouter = createTRPCRouter({
  getStatus: publicProcedure.query(async () => {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return {
        gmail: { status: "DISCONNECTED" as IntegrationStatus, accountEmail: null, connectedAt: null, error: null },
        calendar: { status: "DISCONNECTED" as IntegrationStatus, accountEmail: null, connectedAt: null, error: null },
      };
    }

    const accounts = await db.query.corsairAccounts.findMany({
      where: eq(corsairAccounts.tenantId, tenantId),
    });

    const integrations = await db.query.corsairIntegrations.findMany();
    const integrationMap = new Map(integrations.map((i) => [i.id, i.name]));

    const findAccount = (pluginName: string) => {
      return accounts.find((acc) => integrationMap.get(acc.integrationId) === pluginName);
    };

    const gmailAcc = findAccount("gmail");
    const calAcc = findAccount("googlecalendar");

    const formatAccStatus = (acc: typeof gmailAcc): {
      status: IntegrationStatus;
      accountEmail: string | null;
      connectedAt: Date | null;
      error: string | null;
    } => {
      if (!acc) {
        return { status: "DISCONNECTED", accountEmail: null, connectedAt: null, error: null };
      }

      const currentStatus = (acc.status as IntegrationStatus) || "CONNECTED";

      return {
        status: currentStatus,
        accountEmail: acc.accountEmail ?? null,
        connectedAt: acc.createdAt ?? null,
        error: acc.statusError ?? null,
      };
    };

    return {
      gmail: formatAccStatus(gmailAcc),
      calendar: formatAccStatus(calAcc),
    };
  }),

  disconnect: publicProcedure
    .input(z.object({ plugin: z.enum(["gmail", "googlecalendar"]) }))
    .mutation(async ({ input }) => {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new Error("Unauthorized");
      }

      const pluginName = input.plugin;

      // 1. Try to stop active watch / channel if metadata exists
      try {
        const webhookRecord = await db.query.corsairWebhooks.findFirst({
          where: and(
            eq(corsairWebhooks.tenantId, tenantId),
            eq(corsairWebhooks.plugin, pluginName)
          ),
        });

        const kek = process.env.CORSAIR_KEK;
        if (kek) {
          const database = createCorsairDatabase(conn);
          const km = createAccountKeyManager({
            authType: "oauth_2",
            integrationName: pluginName,
            tenantId,
            kek,
            database,
          });
          const accessToken = await km.get_access_token().catch(() => null);

          if (accessToken) {
            if (pluginName === "gmail") {
              // Gmail: stop watch via users.stop (no channelId needed)
              await fetch("https://gmail.googleapis.com/gmail/v1/users/me/stop", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
              }).catch((e) => console.warn(`[Disconnect] Gmail stop error for ${tenantId}:`, e));
            } else if (pluginName === "googlecalendar" && webhookRecord?.channelId && webhookRecord?.resourceId) {
              // Calendar: stop channel using stored metadata
              await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  id: webhookRecord.channelId,
                  resourceId: webhookRecord.resourceId,
                }),
              }).catch((e) => console.warn(`[Disconnect] Calendar stop error for ${tenantId}:`, e));
            }
          }
        }
      } catch (err) {
        console.warn(`[Disconnect] Non-fatal watch stop error for ${tenantId} (${pluginName}):`, err);
      }

      // Find integration ID
      const integration = await db.query.corsairIntegrations.findFirst({
        where: eq(corsairIntegrations.name, pluginName),
      });

      if (integration) {
        // Get account to find account_id for entities cleanup
        const account = await db.query.corsairAccounts.findFirst({
          where: and(
            eq(corsairAccounts.tenantId, tenantId),
            eq(corsairAccounts.integrationId, integration.id)
          ),
        });

        if (account) {
          // 2. Wipe entities & events associated with this account
          await db.delete(corsairEntities).where(eq(corsairEntities.accountId, account.id));
          await db.delete(corsairEvents).where(eq(corsairEvents.accountId, account.id));

          // Delete account row
          await db.delete(corsairAccounts).where(eq(corsairAccounts.id, account.id));
        }
      }

      // Delete webhook metadata row
      await db.delete(corsairWebhooks).where(
        and(
          eq(corsairWebhooks.tenantId, tenantId),
          eq(corsairWebhooks.plugin, pluginName)
        )
      );

      return { success: true };
    }),
});
