"use client";

import { useMemo, useState } from "react";
import {
  formatAttendees,
  formatEventWhen,
  LinkifiedText,
} from "@/lib/display";
import { formatWeekLabel, getWeekBounds } from "@/lib/week";
import { api } from "@/trpc/react";

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CalendarPanel() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const week = useMemo(() => getWeekBounds(weekOffset), [weekOffset]);
  const weekLabel = formatWeekLabel(week.start, week.end);

  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 1);

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState(toDatetimeLocalValue(defaultStart));
  const [end, setEnd] = useState(toDatetimeLocalValue(defaultEnd));
  const [attendees, setAttendees] = useState("");

  const utils = api.useUtils();

  const events = api.calendar.searchEvents.useQuery({
    query: activeSearch,
    weekStart: week.start.toISOString(),
    weekEnd: week.end.toISOString(),
    limit: 50,
    offset: 0,
  });

  const refreshEvents = api.calendar.refreshEvents.useMutation({
    onSuccess: async () => {
      await utils.calendar.searchEvents.invalidate();
    },
  });

  const createDraft = api.calendar.createDraft.useMutation({
    onSuccess: async () => {
      await utils.calendar.searchEvents.invalidate();
      resetForm();
    },
  });

  const sendInvite = api.calendar.sendInvite.useMutation({
    onSuccess: async () => {
      await utils.calendar.searchEvents.invalidate();
      resetForm();
    },
  });

  function resetForm() {
    setSummary("");
    setDescription("");
    setLocation("");
    setAttendees("");
  }

  function parseAttendees() {
    return attendees
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
  }

  function toIso(datetimeLocal: string) {
    return new Date(datetimeLocal).toISOString();
  }

  const eventInput = {
    summary,
    description: description || undefined,
    location: location || undefined,
    start: toIso(start),
    end: toIso(end),
    attendees: parseAttendees(),
  };

  const getDayLabel = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col gap-6 w-full min-h-[600px] text-gray-800 dark:text-gray-100">
      {/* Top Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-gray-950/70 border border-gray-200/80 dark:border-gray-900 p-4 rounded-2xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Previous Week"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-200/50 dark:border-gray-800 shadow-inner">
            {weekLabel}
          </span>

          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all shadow-xs cursor-pointer"
            title="Next Week"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => refreshEvents.mutate()}
          disabled={refreshEvents.isPending}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-950 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 ${refreshEvents.isPending ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"
            />
          </svg>
          {refreshEvents.isPending ? "Syncing..." : "Sync Calendar"}
        </button>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Timeline / Event List */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          {/* Search form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveSearch(search);
            }}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center h-10 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-9 pr-3 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-bold text-white dark:text-gray-950 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-gray-200 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Search
            </button>
            {(search || activeSearch) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveSearch("");
                }}
                className="h-10 px-3 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Events rendering list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 px-1">Upcoming Events</h2>
            
            {events.isLoading && (
              <div className="py-12 text-center text-sm text-gray-500">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Loading events...
              </div>
            )}
            {events.error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-sm">
                {events.error.message}
              </div>
            )}

            {events.data && (
              <div className="flex flex-col gap-3.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                {events.data.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                    <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    No calendar events scheduled for this week.
                  </div>
                ) : (
                  events.data.map((event) => {
                    const isExpanded = expandedEventId === event.id;
                    const startDate = new Date(event.start);
                    
                    const startHours = startDate.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true
                    });
                    
                    const eventDateLabel = startDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric"
                    });

                    const titleText = event.summary 
                      ? event.summary.replace(/\b\w/g, (char) => char.toUpperCase()) 
                      : "Untitled Event";

                    return (
                      <div
                        key={event.id}
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                          isExpanded 
                            ? "bg-purple-50/20 dark:bg-purple-950/10 border-purple-200/80 dark:border-purple-900/50 shadow-xs" 
                            : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 hover:border-gray-300 dark:hover:border-gray-800 hover:bg-gray-50/30 dark:hover:bg-gray-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Time & Date Column (Left) */}
                          <div className="flex flex-col items-center justify-center w-20 flex-shrink-0 text-center select-none">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                              {eventDateLabel}
                            </span>
                            <span className="text-sm font-extrabold text-gray-800 dark:text-gray-100 mt-0.5">
                              {startHours.replace(" AM", "").replace(" PM", "")}
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-tight">
                              {startHours.endsWith("PM") ? "PM" : "AM"}
                            </span>
                          </div>

                          {/* Vertical Divider */}
                          <div className="w-px h-10 bg-gray-200 dark:bg-gray-800 self-center" />

                          {/* Details Column (Right) */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-extrabold text-gray-950 dark:text-gray-100 truncate leading-snug">
                                {titleText}
                              </h3>
                              <svg
                                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transform transition-transform flex-shrink-0 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
                              {/* Event Duration/When */}
                              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatEventWhen(event.start, event.end)}
                              </span>

                              {/* Location */}
                              {event.location && (
                                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 max-w-[200px] truncate">
                                  <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Info Area */}
                        {isExpanded && (
                          <div className="mt-4 pl-24 pt-3 border-t border-gray-100 dark:border-gray-900 space-y-4">
                            {event.description && (
                              <div>
                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1">Description</h4>
                                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  <LinkifiedText text={event.description} />
                                </div>
                              </div>
                            )}
                            
                            {event.attendees && event.attendees.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-1.5">Attendees</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {event.attendees.map((att, idx) => (
                                    <span
                                      key={idx}
                                      className={`text-[10px] px-2.5 py-0.5 rounded-lg border font-semibold ${
                                        att.responseStatus === "accepted"
                                          ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50"
                                          : att.responseStatus === "declined"
                                          ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50"
                                          : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800"
                                      }`}
                                      title={att.email || ""}
                                    >
                                      {att.displayName || att.email || "Attendee"}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Event Creator Form */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schedule New Event
          </h2>
          
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Marketing sync meeting"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda, notes, etc."
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all resize-y placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Google Meet or Office conference room"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                  End Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Attendees
              </label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="email1@test.com, email2@test.com"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-500"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 pl-1">
                Enter email addresses separated by commas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => createDraft.mutate(eventInput)}
                disabled={createDraft.isPending || !summary || !start || !end}
                className="flex-1 px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:bg-gray-50 dark:disabled:bg-gray-950 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                {createDraft.isPending ? "Creating..." : "Save Draft"}
              </button>
              
              <button
                type="button"
                onClick={() => sendInvite.mutate(eventInput)}
                disabled={sendInvite.isPending || !summary || !start || !end}
                className="flex-1 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:bg-purple-200 dark:disabled:bg-purple-950/40 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {sendInvite.isPending ? "Inviting..." : "Send Invite"}
              </button>
            </div>

            {(createDraft.error ?? sendInvite.error) && (
              <p className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-xs">
                {(createDraft.error ?? sendInvite.error)?.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
