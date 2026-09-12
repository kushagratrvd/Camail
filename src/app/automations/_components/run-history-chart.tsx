'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Activity } from 'lucide-react';

interface DailyStat {
  date: string;
  succeeded: number;
  failed: number;
}

interface RunHistoryChartProps {
  stats: {
    totalSucceeded: number;
    totalFailed: number;
    totalRuns: number;
    dailyStats: DailyStat[];
  };
}

export function RunHistoryChart({ stats }: RunHistoryChartProps) {
  const [hoveredDay, setHoveredDay] = useState<DailyStat | null>(null);

  const maxDaily = Math.max(
    1,
    ...stats.dailyStats.map((d) => d.succeeded + d.failed)
  );

  const successRate =
    stats.totalRuns > 0
      ? Math.round((stats.totalSucceeded / stats.totalRuns) * 100)
      : 100;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Execution Activity (Last 30 Days)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {stats.totalRuns} total runs across all active & past automations
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.totalSucceeded} Succeeded</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            <span>{stats.totalFailed} Failed</span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-semibold">
            {successRate}% Success
          </div>
        </div>
      </div>

      {/* Bar graph visualizer */}
      <div className="relative pt-2">
        <div className="flex items-end justify-between gap-1.5 h-20 w-full px-1">
          {stats.dailyStats.map((day) => {
            const total = day.succeeded + day.failed;
            const heightPercent = total > 0 ? Math.max(12, Math.round((total / maxDaily) * 100)) : 6;
            const isFailed = day.failed > 0;

            return (
              <div
                key={day.date}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    total === 0
                      ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      : isFailed
                      ? 'bg-rose-500/80 hover:bg-rose-500'
                      : 'bg-emerald-500/80 hover:bg-emerald-500'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Hover detail tooltip */}
        <div className="h-6 mt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60 pt-1.5">
          <span>30 days ago</span>
          <div className="font-medium text-zinc-700 dark:text-zinc-300">
            {hoveredDay ? (
              <span>
                {new Date(hoveredDay.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
                :{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {hoveredDay.succeeded} ok
                </strong>
                {hoveredDay.failed > 0 && (
                  <strong className="text-rose-500 ml-1.5">{hoveredDay.failed} failed</strong>
                )}
              </span>
            ) : (
              <span className="text-zinc-400">Hover over any bar to inspect daily breakdown</span>
            )}
          </div>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
