import { CronExpressionParser } from 'cron-parser';

/**
 * Calculates the next execution date based on a cron expression and timezone.
 */
export function getNextRunTime(cronExpression: string, timezone: string = 'UTC'): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: timezone || 'UTC',
      currentDate: new Date(),
    });
    return interval.next().toDate();
  } catch (err) {
    console.error(`[cron-utils] Error parsing cron expression "${cronExpression}":`, err);
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Validates whether a cron expression is syntactically valid.
 */
export function validateCronExpression(cronExpression: string): boolean {
  try {
    CronExpressionParser.parse(cronExpression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Produces a human-friendly label for standard cron presets.
 */
export function formatCronLabel(cronExpression: string): string {
  const clean = cronExpression.trim();
  switch (clean) {
    case '0 8 * * *':
      return 'Daily at 8:00 AM';
    case '30 9 * * *':
      return 'Daily at 9:30 AM';
    case '0 9 * * *':
      return 'Daily at 9:00 AM';
    case '0 12 * * *':
      return 'Daily at 12:00 PM';
    case '0 18 * * *':
      return 'Daily at 6:00 PM';
    case '0 9 * * 1':
      return 'Every Monday at 9:00 AM';
    case '0 9 * * 1-5':
      return 'Weekdays at 9:00 AM';
    case '*/5 * * * *':
      return 'Every 5 minutes';
    case '*/15 * * * *':
      return 'Every 15 minutes';
    case '*/30 * * * *':
      return 'Every 30 minutes';
    case '0 * * * *':
      return 'Every hour';
    default:
      return clean;
  }
}
