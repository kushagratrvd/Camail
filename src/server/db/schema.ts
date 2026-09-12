import { pgTable, text, jsonb, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const corsairIntegrations = pgTable('corsair_integrations', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    name: text('name').notNull(),
    config: jsonb('config').notNull().default({}),
    dek: text('dek'),
});

export const corsairAccounts = pgTable('corsair_accounts', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    tenantId: text('tenant_id').notNull(),
    integrationId: text('integration_id').notNull().references(() => corsairIntegrations.id),
    config: jsonb('config').notNull().default({}),
    dek: text('dek'),
    status: text('status').notNull().default('DISCONNECTED'), // CONNECTED | SYNCING | RECONNECT_REQUIRED | DISCONNECTED | ERROR
    statusError: text('status_error'),
    accountEmail: text('account_email'),
}, (table) => [
    index('accounts_tenant_idx').on(table.tenantId),
]);

export const corsairWebhooks = pgTable('corsair_webhooks', {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id').notNull(),
    plugin: text('plugin').notNull(), // 'gmail' | 'googlecalendar'
    historyId: text('history_id'),
    watchExpiration: timestamp('watch_expiration', { withTimezone: true }),
    channelId: text('channel_id'),
    resourceId: text('resource_id'),
    channelExpiration: timestamp('channel_expiration', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    index('webhooks_tenant_plugin_idx').on(table.tenantId, table.plugin),
]);

export const corsairEntities = pgTable('corsair_entities', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    accountId: text('account_id').notNull().references(() => corsairAccounts.id),
    entityId: text('entity_id').notNull(),
    entityType: text('entity_type').notNull(),
    version: text('version').notNull(),
    data: jsonb('data').notNull().default({}),
}, (table) => [
    index('entities_account_idx').on(table.accountId),
]);

export const corsairEvents = pgTable('corsair_events', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    accountId: text('account_id').notNull().references(() => corsairAccounts.id),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull().default({}),
    status: text('status'),
}, (table) => [
    index('events_account_idx').on(table.accountId),
    index('events_created_at_idx').on(table.createdAt),
]);

export const corsairChats = pgTable('corsair_chats', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    tenantId: text('tenant_id').notNull(),
    title: text('title').notNull().default('New Chat'),
    messages: jsonb('messages').notNull().default([]),
}, (table) => [
    index('chats_tenant_idx').on(table.tenantId),
    index('chats_updated_at_idx').on(table.updatedAt),
]);

export const corsairSyncQuotas = pgTable('corsair_sync_quotas', {
    tenantId: text('tenant_id').primaryKey(),
    count: integer('count').notNull().default(0),
    lastReset: text('last_reset').notNull(), // YYYY-MM-DD
    aiCount: integer('ai_count').notNull().default(0),
    aiLastReset: text('ai_last_reset').notNull().default(''), // YYYY-MM
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const automations = pgTable('automations', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    tenantId: text('tenant_id').notNull(),
    name: text('name').notNull(),
    prompt: text('prompt').notNull(),
    model: text('model').notNull().default('google/gemini-2.5-flash'),
    schedule: text('schedule').notNull(), // Cron expression e.g. "30 9 * * *"
    scheduleLabel: text('schedule_label').notNull(), // e.g. "Daily at 9:30 AM"
    timezone: text('timezone').notNull().default('UTC'),
    status: text('status').notNull().default('active'), // 'active' | 'paused'
    icon: text('icon').notNull().default('Zap'),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }),
}, (table) => [
    index('automations_tenant_idx').on(table.tenantId),
    index('automations_status_next_run_idx').on(table.status, table.nextRunAt),
]);

export const automationRuns = pgTable('automation_runs', {
    id: text('id').primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    automationId: text('automation_id').notNull().references(() => automations.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').notNull(),
    status: text('status').notNull().default('running'), // 'running' | 'succeeded' | 'failed'
    resultTitle: text('result_title'),
    resultContent: text('result_content'), // full markdown AI response
    modelUsed: text('model_used'),
    durationMs: integer('duration_ms'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
    index('runs_automation_idx').on(table.automationId),
    index('runs_tenant_idx').on(table.tenantId),
    index('runs_created_at_idx').on(table.createdAt),
]);

export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type NewAutomationRun = typeof automationRuns.$inferInsert;