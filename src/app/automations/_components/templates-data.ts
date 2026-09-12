export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Email' | 'Productivity' | 'Calendar' | 'Career';
  prompt: string;
  schedule: string;
  scheduleLabel: string;
  icon: string;
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: 'morning-briefing',
    name: 'Morning Email Briefing',
    description: 'Summarizes unread & important emails from the last 24 hours into high priority and general items.',
    category: 'Email',
    prompt: `Review my Gmail inbox for emails received in the last 24 hours (use query "newer_than:1d"). 
Categorize them into:
1. High Priority (urgent actions, direct questions, clients/team)
2. Important Updates & Status Reports
3. Newsletters & Low Priority

Provide a concise, executive-level summary with sender names, subject, and explicit action items needed from me today.`,
    schedule: '30 8 * * *',
    scheduleLabel: 'Daily at 8:30 AM',
    icon: 'Mail',
  },
  {
    id: 'unanswered-followups',
    name: 'Unanswered Follow-ups Tracker',
    description: 'Finds recent emails requiring your response where no reply has been sent yet.',
    category: 'Productivity',
    prompt: `Search my Gmail for emails received in the last 3 days (query "newer_than:3d") where someone asked a question, requested deliverables, or scheduled an item that requires a response.
List each one with:
- Sender Name & Email
- Subject & Received Date
- Summary of what they need
- Suggested quick reply or next action`,
    schedule: '0 9 * * 1-5',
    scheduleLabel: 'Weekdays at 9:00 AM',
    icon: 'Clock',
  },
  {
    id: 'calendar-briefing',
    name: 'Daily Schedule & Meeting Prep',
    description: "Inspects today's calendar events and pulls recent email context for each meeting attendee.",
    category: 'Calendar',
    prompt: `Inspect today's Google Calendar schedule.
For each scheduled meeting:
1. State the meeting title, start & end time, and attendee list.
2. For primary attendees, search recent emails from them to find relevant discussion context or pending topics.
3. Provide a quick 2-bullet preparation note for the meeting.`,
    schedule: '0 8 * * *',
    scheduleLabel: 'Daily at 8:00 AM',
    icon: 'Calendar',
  },
  {
    id: 'recruiter-tracker',
    name: 'Job Application & Interview Tracker',
    description: 'Searches incoming emails for interview invites, application status updates, and recruiter replies.',
    category: 'Career',
    prompt: `Search my Gmail inbox for emails from the last 24 hours related to job applications, interviews, recruiters, or offers (e.g. query "newer_than:1d (interview OR application OR recruiter OR offer OR scheduling)").
Summarize:
- Company name & recruiter
- Current status (Interview Scheduled, Assessment Received, Rejection, Offer)
- Any action required (e.g. reply with availability, confirm date)`,
    schedule: '0 18 * * *',
    scheduleLabel: 'Daily at 6:00 PM',
    icon: 'Briefcase',
  },
];
