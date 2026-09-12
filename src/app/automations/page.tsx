'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Mail,
  Calendar,
  Briefcase,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Layers,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { RunHistoryChart } from './_components/run-history-chart';
import { CreateAutomationModal } from './_components/create-automation-modal';
import { RunDetailModal } from './_components/run-detail-modal';
import { AUTOMATION_TEMPLATES, type AutomationTemplate } from './_components/templates-data';

export default function AutomationsPage() {
  const [activeTab, setActiveTab] = useState<'automations' | 'runs'>('automations');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
  const [inspectRunId, setInspectRunId] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const utils = api.useUtils();

  const { data: automationsList, isLoading: loadingAutomations } = api.automations.list.useQuery();
  const { data: runsList, isLoading: loadingRuns } = api.automations.listRuns.useQuery({
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: statsData } = api.automations.getStats.useQuery();

  const toggleStatusMutation = api.automations.toggleStatus.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      utils.automations.getStats.invalidate();
    },
  });

  const deleteMutation = api.automations.delete.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      utils.automations.getStats.invalidate();
    },
  });

  const runNowMutation = api.automations.runNow.useMutation({
    onSuccess: () => {
      setActionFeedback('Automation triggered! Inngest is executing it in the background.');
      setTimeout(() => setActionFeedback(null), 4000);
      utils.automations.listRuns.invalidate();
      utils.automations.list.invalidate();
    },
    onError: (err) => {
      setActionFeedback(`Error triggering run: ${err.message}`);
      setTimeout(() => setActionFeedback(null), 5000);
    },
  });

  const handleUseTemplate = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setEditingAutomation(null);
    setIsCreateOpen(true);
  };

  const handleOpenCreate = () => {
    setSelectedTemplate(null);
    setEditingAutomation(null);
    setIsCreateOpen(true);
  };

  const handleEdit = (auto: any) => {
    setEditingAutomation(auto);
    setSelectedTemplate(null);
    setIsCreateOpen(true);
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Mail':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'Clock':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'Calendar':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'Briefcase':
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case 'Sparkles':
        return <Sparkles className="w-4 h-4 text-pink-500" />;
      default:
        return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  const filteredTemplates =
    templateCategory === 'All'
      ? AUTOMATION_TEMPLATES
      : AUTOMATION_TEMPLATES.filter((t) => t.category === templateCategory);

  const defaultStats = {
    totalSucceeded: statsData?.totalSucceeded || 0,
    totalFailed: statsData?.totalFailed || 0,
    totalRuns: statsData?.totalRuns || 0,
    dailyStats: statsData?.dailyStats || [],
  };

  return (
    <div className="flex-1 h-full overflow-y-auto custom-scrollbar bg-zinc-50/50 dark:bg-zinc-950 p-6 sm:p-10 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Zap className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Schedule recurring AI agents to monitor your inbox, summarize priorities, and organize your calendar.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>

        {/* Global Action Feedback Toast */}
        {actionFeedback && (
          <div className="p-3.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <span>{actionFeedback}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-zinc-400 hover:text-white dark:hover:text-zinc-900"
            >
              &times;
            </button>
          </div>
        )}

        {/* 30-Day Activity Chart */}
        <RunHistoryChart stats={defaultStats} />

        {/* Tabs: Automations vs Runs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-px">
          <button
            onClick={() => setActiveTab('automations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'automations'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Automations ({automationsList?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('runs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'runs'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <History className="w-4 h-4" />
            Runs History ({runsList?.length || 0})
          </button>
        </div>

        {/* Tab 1: Automations View */}
        {activeTab === 'automations' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Automations Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              {loadingAutomations ? (
                <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Loading automations...</span>
                </div>
              ) : automationsList?.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    No automations configured yet
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                    Create a custom automation or start instantly with one of the templates below.
                  </p>
                  <button
                    onClick={handleOpenCreate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Your First Automation
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {automationsList?.map((auto) => (
                    <div
                      key={auto.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/40 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          {getIconComponent(auto.icon)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {auto.name}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                auto.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                              }`}
                            >
                              {auto.status === 'active' ? 'Active' : 'Paused'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              {auto.scheduleLabel || auto.schedule}
                            </span>
                            <span>•</span>
                            <span className="text-[11px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300">
                              {auto.model.split('/')[1] || auto.model}
                            </span>
                            <span>•</span>
                            <span>{auto.totalRuns} runs</span>
                            {auto.nextRunAt && auto.status === 'active' && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-400">
                                  Next: {new Date(auto.nextRunAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button
                          onClick={() => runNowMutation.mutate({ id: auto.id })}
                          disabled={runNowMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                          title="Trigger manual run immediately"
                        >
                          <Play className="w-3 h-3 text-emerald-500" />
                          Run Now
                        </button>

                        <button
                          onClick={() => toggleStatusMutation.mutate({ id: auto.id })}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          title={auto.status === 'active' ? 'Pause automation' : 'Resume automation'}
                        >
                          {auto.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none">
                            <MoreVertical className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 shadow-lg w-40">
                            <DropdownMenuItem
                              onClick={() => handleEdit(auto)}
                              className="text-xs font-medium cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Delete automation "${auto.name}"?`)) {
                                  deleteMutation.mutate({ id: auto.id });
                                }
                              }}
                              className="text-xs font-medium text-rose-600 dark:text-rose-400 cursor-pointer rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Starter Templates Gallery */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Starter Templates
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pre-engineered routines you can activate with a single click.
                  </p>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['All', 'Email', 'Productivity', 'Calendar', 'Career'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTemplateCategory(cat)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-all cursor-pointer whitespace-nowrap ${
                        templateCategory === cat
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                          {getIconComponent(tpl.icon)}
                        </div>
                        <span className="text-[10px] font-semibold tracking-wide text-zinc-400 uppercase bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          {tpl.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-amber-500 transition-colors">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{tpl.scheduleLabel}</span>
                      </div>

                      <button
                        onClick={() => handleUseTemplate(tpl)}
                        className="flex items-center gap-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <span>Use Template</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Runs History View */}
        {activeTab === 'runs' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Statuses' },
                  { id: 'succeeded', label: 'Succeeded' },
                  { id: 'failed', label: 'Failed' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-zinc-400">{runsList?.length || 0} runs recorded</span>
            </div>

            {/* Runs Table */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              {loadingRuns ? (
                <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-xs">Loading execution runs...</span>
                </div>
              ) : runsList?.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    No runs recorded yet
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Runs will appear here automatically when automations trigger, or when you click "Run Now".
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {runsList?.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => setInspectRunId(run.id)}
                      className="flex items-center justify-between p-4 sm:p-4.5 hover:bg-zinc-50/60 dark:hover:bg-zinc-850/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="shrink-0">
                          {run.status === 'succeeded' && (
                            <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                          )}
                          {run.status === 'failed' && (
                            <div className="w-7 h-7 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                              <XCircle className="w-4 h-4" />
                            </div>
                          )}
                          {run.status === 'running' && (
                            <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 animate-pulse">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-amber-500 transition-colors">
                            {run.resultTitle || run.automationName}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400">
                            <span>{run.automationName}</span>
                            {run.modelUsed && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{run.modelUsed.split('/')[1] || run.modelUsed}</span>
                              </>
                            )}
                            {run.durationMs && (
                              <>
                                <span>•</span>
                                <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-zinc-400">
                          {new Date(run.startedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                          })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateAutomationModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setSelectedTemplate(null);
            setEditingAutomation(null);
          }}
          initialTemplate={selectedTemplate}
          editData={editingAutomation}
        />

        <RunDetailModal
          runId={inspectRunId}
          onClose={() => setInspectRunId(null)}
        />
      </div>
    </div>
  );
}
