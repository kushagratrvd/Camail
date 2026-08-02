import { z } from 'zod';

export const ChatRequestSchema = z.object({
  messages: z.array(z.unknown()),
  model: z.string().optional().default('google/gemini-2.5-flash'),
  instructions: z.string().optional(),
  timezone: z.string().optional().default('Asia/Kolkata'),
});

export const GoogleWebhookHeadersSchema = z.object({
  'x-goog-channel-id': z.string(),
  'x-goog-resource-id': z.string(),
  'x-goog-resource-state': z.string(),
});

export const NgrokTunnelSchema = z.object({
  tunnels: z.array(
    z.object({
      public_url: z.string(),
    })
  )
});

export const GmailWatchResponseSchema = z.object({
  historyId: z.union([z.string(), z.number()]).transform(String),
  expiration: z.union([z.string(), z.number()]).transform(String),
});

export const GooglePubSubMessageSchema = z.object({
  message: z.object({
    data: z.string(),
  }),
});

export const GmailWatchPayloadSchema = z.object({
  emailAddress: z.string().email(),
  historyId: z.number(),
});
