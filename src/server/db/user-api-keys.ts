import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth-schema';

export const userApiKeys = pgTable('user_api_keys', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  googleKeyEnc: text('google_key_enc'),
  openaiKeyEnc: text('openai_key_enc'),
  anthropicKeyEnc: text('anthropic_key_enc'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
