import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, conn } from "./db";
import { env } from "@/env";
import * as schema from "./db/schema";
import * as authSchema from "./db/auth-schema";
import { createAccountKeyManager } from "corsair/core";
import { createCorsairDatabase } from "corsair/db";
import { registerGoogleCalendarWebhook, registerGmailWebhook } from "./lib/webhooks";
import * as crypto from "node:crypto";
import { ensureCredentialsSynced } from "./corsair";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: {
            ...schema,
            user: authSchema.users,
            session: authSchema.sessions,
            account: authSchema.accounts,
            verification: authSchema.verifications
        }
    }),
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
        "https://camail.kushagratrivedi.me",
        "https://camail.vercel.app",
    ],
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            scope: [
                "openid",
                "profile",
                "email",
                "https://www.googleapis.com/auth/gmail.modify",
                "https://www.googleapis.com/auth/calendar",
            ],
            accessType: "offline",
            prompt: "consent",
        }
    }
});
