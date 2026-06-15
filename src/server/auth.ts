import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { env } from "@/env";
import * as schema from "./db/schema";
import * as authSchema from "./db/auth-schema";
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
    socialProviders: {
        google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            scope: [
                "openid",
                "profile",
                "email"
            ]
        }
    },
    baseURL: env.BETTER_AUTH_URL,
});
