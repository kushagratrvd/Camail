'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Cpu,
  Copy,
  Check,
  Calendar,
  Zap,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown-renderer';

interface RunDetailModalProps {
  runId: string | null;
  onClose: () => void;
}

export function RunDetailModal({ runId, onClose }: RunDetailModalProps) {
  const [copied, setCopied] = useState(false);

  const { data: run, isLoading } = api.automations.getRunById.useQuery(
    { id: runId! },
    { enabled: !!runId }
  );

  if (!runId) return null;

  const handleCopy = () => {
    if (!run?.resultContent) return;
    navigator.clipboard.writeText(run.resultContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return null;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 dark:border-zinc-850 gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3 text-amber-500" />
                {run?.automationName || 'Automation'}
              </span>

              {run?.status === 'succeeded' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Succeeded
                </span>
              )}
              {run?.status === 'failed' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/50 px-2.5 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Failed
                </span>
              )}
              {run?.status === 'running' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/50 px-2.5 py-0.5 rounded-full animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Running...
                </span>
              )}
            </div>

            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {run?.resultTitle || 'Automation Run Details'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {run?.resultContent && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Execution Metadata Bar */}
        {run && (
          <div className="flex flex-wrap items-center gap-4 px-5 py-2.5 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-850 text-xs text-zinc-500 dark:text-zinc-400">
            {run.durationMs && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Worked for {formatDuration(run.durationMs)}</span>
              </div>
            )}
            {run.modelUsed && (
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                <span>Model: {run.modelUsed}</span>
              </div>
            )}
            {run.startedAt && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>
                  {new Date(run.startedAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Modal Body / Full AI Markdown */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading execution trace...</span>
            </div>
          ) : run?.error && !run.resultContent ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm">
              <p className="font-semibold mb-1">Automation failed</p>
              <p className="font-mono text-xs">{run.error}</p>
            </div>
          ) : (
            <div className="prose dark:prose-invert prose-zinc max-w-none text-sm leading-relaxed">
              <MarkdownRenderer content={run?.resultContent || 'No output recorded.'} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
