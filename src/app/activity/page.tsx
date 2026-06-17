"use client";

import { useState } from "react";
import { api, type RouterOutputs } from "@/trpc/react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

type ActivityEvent = {
  id: string;
  eventType: string;
  status: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  payload: unknown;
};

export default function ActivityPage() {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const limit = 10;
  
  const { data, isLoading, error, refetch } = api.activity.getRecentEvents.useQuery(
    { page, limit },
    {
      enabled: !!session,
      refetchOnWindowFocus: false,
    }
  );

  const events = (data?.events ?? []) as ActivityEvent[];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const [selectedEvent, setSelectedEvent] = useState<typeof events[0] | null>(null);

  const formatJSON = (json: unknown) => {
    try {
      if (typeof json === 'string') {
        json = JSON.parse(json);
      }
      return JSON.stringify(json, null, 2);
    } catch {
      return "Invalid JSON payload";
    }
  };

  const getStatusBadge = (status: string | null) => {
    const s = status?.toLowerCase() ?? "pending";
    if (s === "success" || s === "completed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/50">
          <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
          Success
        </span>
      );
    }
    if (s === "failed" || s === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/50">
          <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
        Processing
      </span>
    );
  };

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="max-w-md w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Authentication Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Please sign in in the top right header to view your active workspace events and execution history.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950/20 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-900 bg-white dark:bg-gray-950 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Workspace Activity</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Real-time background execution log of AI calls and synced integration events.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-98 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {isLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Main viewport */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-6 animate-pulse">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-full w-20" />
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 text-red-700 dark:text-red-400 text-sm max-w-2xl mx-auto text-center shadow-sm">
            <h3 className="font-bold text-base mb-1">Failed to fetch activities</h3>
            <p>{error.message}</p>
          </div>
        ) : !events || events.length === 0 ? (
          <div className="max-w-2xl mx-auto mt-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375c1.08 0 1.96-.88 1.96-1.96a2.1 2.1 0 0 0-.25-1.02a2.22 2.22 0 0 0-1.71-1.02H9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296a3.745 3.745 0 0 1-3.296 1.043A8.933 8.933 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043a3.745 3.745 0 0 1-1.043-3.296A8.933 8.933 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296a3.746 3.746 0 0 1 3.296-1.043A8.933 8.933 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043a3.746 3.746 0 0 1 1.043 3.296A8.933 8.933 0 0 1 21 12Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">No Events Found</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-md mx-auto">
              We couldn&apos;t find any background activities in your account yet. Try asking your AI assistant a question or syncing your inbox to trigger events!
            </p>
            <Link 
              href="/" 
              className="inline-flex bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Start Chatting
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/75 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-900 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <th className="px-6 py-4">Event Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Logged Time</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-900 text-sm text-gray-700 dark:text-gray-300">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
                      {event.eventType}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Showing page {page} of {totalPages} <span className="text-gray-300 dark:text-gray-700 mx-1">|</span> {total} total events
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payload Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-3xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-900 transform transition-all relative overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between bg-gray-50 dark:bg-gray-950">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Event Details</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">ID: {selectedEvent.id}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block mb-1">Event Type</span>
                  <span className="font-mono bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded font-bold text-gray-800 dark:text-gray-200">{selectedEvent.eventType}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block mb-1">Status</span>
                  <span>{getStatusBadge(selectedEvent.status)}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block mb-1">Created At</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{new Date(selectedEvent.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 block mb-1">Last Updated</span>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{new Date(selectedEvent.updatedAt).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs block mb-2">Payload Data (JSON)</span>
                <pre className="bg-gray-900 dark:bg-black/50 text-gray-100 dark:text-gray-300 p-4 rounded-xl font-mono text-xs overflow-x-auto text-left max-h-[40vh] custom-scrollbar border dark:border-gray-900 shadow-inner leading-relaxed">
                  {formatJSON(selectedEvent.payload)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-900 flex justify-end bg-gray-50/50 dark:bg-gray-900/20">
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-950 px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
