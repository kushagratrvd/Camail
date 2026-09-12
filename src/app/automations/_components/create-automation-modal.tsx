'use client';

import { useState, useEffect } from 'react';
import { api } from '@/trpc/react';
import {
  X,
  Zap,
  Sparkles,
  Clock,
  Calendar,
  Mail,
  Briefcase,
  Bell,
  Cpu,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import { AUTOMATION_TEMPLATES } from './templates-data';

interface CreateAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTemplate?: {
    name: string;
    prompt: string;
    schedule: string;
    scheduleLabel?: string;
    icon?: string;
  } | null;
  editData?: {
    id: string;
    name: string;
    prompt: string;
    model: string;
    schedule: string;
    scheduleLabel: string;
    timezone: string;
    icon: string;
  } | null;
}

const SCHEDULE_PRESETS = [
  { label: 'Daily at 8:00 AM', cron: '0 8 * * *' },
  { label: 'Daily at 8:30 AM', cron: '30 8 * * *' },
  { label: 'Daily at 9:00 AM', cron: '0 9 * * *' },
  { label: 'Daily at 12:00 PM', cron: '0 12 * * *' },
  { label: 'Daily at 6:00 PM', cron: '0 18 * * *' },
  { label: 'Weekdays at 9:00 AM', cron: '0 9 * * 1-5' },
  { label: 'Custom Cron Expression', cron: 'custom' },
];

const ICONS = [
  { name: 'Zap', icon: Zap },
  { name: 'Mail', icon: Mail },
  { name: 'Clock', icon: Clock },
  { name: 'Calendar', icon: Calendar },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'Bell', icon: Bell },
  { name: 'Sparkles', icon: Sparkles },
];

const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

export function CreateAutomationModal({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
  editData,
}: CreateAutomationModalProps) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [schedulePreset, setSchedulePreset] = useState('30 8 * * *');
  const [customCron, setCustomCron] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState('UTC');
  const [icon, setIcon] = useState('Zap');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: keyStatus } = api.apiKeys.getKeyStatus.useQuery(undefined, {
    staleTime: 60000,
  });

  const utils = api.useUtils();

  // Populate data when template or edit data changes
  useEffect(() => {
    if (editData) {
      setName(editData.name);
      setPrompt(editData.prompt);
      setModel(editData.model || 'google/gemini-2.5-flash');
      setTimezone(editData.timezone || 'UTC');
      setIcon(editData.icon || 'Zap');

      const matchingPreset = SCHEDULE_PRESETS.find((p) => p.cron === editData.schedule);
      if (matchingPreset) {
        setSchedulePreset(matchingPreset.cron);
      } else {
        setSchedulePreset('custom');
        setCustomCron(editData.schedule);
      }
    } else if (initialTemplate) {
      setName(initialTemplate.name);
      setPrompt(initialTemplate.prompt);
      setModel('google/gemini-2.5-flash');
      setIcon(initialTemplate.icon || 'Zap');

      const matchingPreset = SCHEDULE_PRESETS.find((p) => p.cron === initialTemplate.schedule);
      if (matchingPreset) {
        setSchedulePreset(matchingPreset.cron);
      } else {
        setSchedulePreset('custom');
        setCustomCron(initialTemplate.schedule);
      }
    } else {
      // Defaults for new automation
      setName('');
      setPrompt('');
      setModel('google/gemini-2.5-flash');
      setSchedulePreset('30 8 * * *');
      setIcon('Zap');
    }

    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && !editData) {
        setTimezone(detected);
      }
    } catch {
      setTimezone('UTC');
    }

    setErrorMsg(null);
  }, [initialTemplate, editData, isOpen]);

  const createMutation = api.automations.create.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      utils.automations.getStats.invalidate();
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  const updateMutation = api.automations.update.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      utils.automations.getById.invalidate({ id: editData!.id });
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      setErrorMsg(err.message);
    },
  });

  if (!isOpen) return null;

  const isEditing = !!editData;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const resolvedCron = schedulePreset === 'custom' ? customCron.trim() : schedulePreset;
  const selectedPresetObj = SCHEDULE_PRESETS.find((p) => p.cron === schedulePreset);
  const resolvedLabel =
    schedulePreset === 'custom' ? `Custom: ${customCron}` : selectedPresetObj?.label || resolvedCron;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please provide a name for this automation.');
      return;
    }
    if (!prompt.trim()) {
      setErrorMsg('Please write an instruction prompt for the AI.');
      return;
    }
    if (!resolvedCron) {
      setErrorMsg('Please specify a valid schedule.');
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: editData.id,
        name: name.trim(),
        prompt: prompt.trim(),
        model,
        schedule: resolvedCron,
        scheduleLabel: resolvedLabel,
        timezone,
        icon,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        prompt: prompt.trim(),
        model,
        schedule: resolvedCron,
        scheduleLabel: resolvedLabel,
        timezone,
        icon,
      });
    }
  };

  const MODELS = [
    {
      id: 'google/gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      provider: 'google',
      hasKey: true, // Default system key provided
      note: 'Fast & included with quota',
    },
    {
      id: 'openai/gpt-5.4',
      label: 'GPT-5.4',
      provider: 'openai',
      hasKey: !!keyStatus?.openai,
      note: keyStatus?.openai ? 'OpenAI key active' : 'Requires key in Settings',
    },
    {
      id: 'openai/gpt-5.2',
      label: 'GPT-5.2',
      provider: 'openai',
      hasKey: !!keyStatus?.openai,
      note: keyStatus?.openai ? 'OpenAI key active' : 'Requires key in Settings',
    },
    {
      id: 'anthropic/claude-opus-4.7',
      label: 'Claude Opus 4.7',
      provider: 'anthropic',
      hasKey: !!keyStatus?.anthropic,
      note: keyStatus?.anthropic ? 'Anthropic key active' : 'Requires key in Settings',
    },
    {
      id: 'anthropic/claude-sonnet-4.6',
      label: 'Claude Sonnet 4.6',
      provider: 'anthropic',
      hasKey: !!keyStatus?.anthropic,
      note: keyStatus?.anthropic ? 'Anthropic key active' : 'Requires key in Settings',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {isEditing ? 'Edit Automation' : 'Create New Automation'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure scheduled autonomous AI tasks on your inbox & calendar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Unable to save automation: </span>
                <span>{errorMsg}</span>
                {errorMsg.toLowerCase().includes('free tier limit') && (
                  <div className="mt-1.5">
                    <Link
                      href="/settings"
                      className="underline font-semibold hover:text-rose-700 dark:hover:text-rose-300"
                    >
                      Go to Settings to add an API key &rarr;
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Template Picker (when creating fresh) */}
          {!isEditing && (
            <div className="space-y-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Quick Fill from Template
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {AUTOMATION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setName(tpl.name);
                      setPrompt(tpl.prompt);
                      setIcon(tpl.icon || 'Zap');
                      const matchingPreset = SCHEDULE_PRESETS.find((p) => p.cron === tpl.schedule);
                      if (matchingPreset) {
                        setSchedulePreset(matchingPreset.cron);
                      } else {
                        setSchedulePreset('custom');
                        setCustomCron(tpl.schedule);
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/80 transition-colors shrink-0 cursor-pointer"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Icon Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Automation Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Daily Morning Inbox Briefing"
                required
                className="w-full px-3.5 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Icon
              </label>
              <div className="flex items-center gap-1.5 p-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                {ICONS.map((ic) => {
                  const IconComp = ic.icon;
                  const isSelected = icon === ic.name;
                  return (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setIcon(ic.name)}
                      className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                      }`}
                      title={ic.name}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Model Selection Dropdown */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                AI Model
              </label>
              <Link
                href="/settings"
                className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors underline"
              >
                Manage API Keys in Settings
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MODELS.map((m) => {
                const isSelected = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`flex items-start justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900/80 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        {m.label}
                        {isSelected && <Check className="w-3 h-3 text-zinc-900 dark:text-zinc-100" />}
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-0.5">{m.note}</span>
                    </div>
                    {m.hasKey ? (
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md border border-emerald-200/50 dark:border-emerald-800/40">
                        Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/40">
                        Key required
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Instruction Prompt <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">Supports multi-tool execution</span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="What should Camail check or do on each run? E.g.: Search emails from last 24h for job application updates, organize by company status, and summarize key actions needed."
              required
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all font-mono leading-relaxed"
            />
          </div>

          {/* Schedule & Timezone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                Schedule
              </label>
              <select
                value={schedulePreset}
                onChange={(e) => setSchedulePreset(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
              >
                {SCHEDULE_PRESETS.map((p) => (
                  <option key={p.cron} value={p.cron}>
                    {p.label}
                  </option>
                ))}
              </select>

              {schedulePreset === 'custom' && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                    placeholder="e.g. */30 * * * *"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Standard 5-part cron syntax: minute hour day month dayOfWeek</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 cursor-pointer"
              >
                {!COMMON_TIMEZONES.includes(timezone) && (
                  <option value={timezone}>{timezone}</option>
                )}
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-400">All executions trigger relative to this timezone</p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Automation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
