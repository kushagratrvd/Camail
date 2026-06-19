"use client";

import { useMemo, useState } from "react";
import {
  formatAttendees,
  formatEventWhen,
  LinkifiedText,
} from "@/lib/display";
import { formatWeekLabel, getWeekBounds } from "@/lib/week";
import { api } from "@/trpc/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw, 
  Search as SearchIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus,
  Loader2
} from "lucide-react";

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
    <div className="flex flex-col gap-6 w-full min-h-[600px] text-zinc-800 dark:text-zinc-100">
      {/* Top Navigation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-3xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-all shadow-xs cursor-pointer"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>
          
          <span className="text-sm font-bold text-zinc-850 dark:text-zinc-200 bg-zinc-100/80 dark:bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
            {weekLabel}
          </span>

          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-full transition-all shadow-xs cursor-pointer"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-150 hover:text-zinc-650 px-3.5 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={() => refreshEvents.mutate({
            weekStart: week.start.toISOString(),
            weekEnd: week.end.toISOString(),
          })}
          disabled={refreshEvents.isPending}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-950 rounded-full transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshEvents.isPending ? "animate-spin" : ""}`} />
          {refreshEvents.isPending ? "Syncing..." : "Sync Calendar"}
        </button>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Timeline / Event List */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          {/* Search form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveSearch(search);
            }}
            className="relative flex items-center gap-2"
          >
            <div className="relative flex-1 flex items-center h-10 rounded-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-650 transition-all">
              <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-10 pr-3 text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-full outline-none"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full shadow-sm transition-all cursor-pointer"
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
                className="h-10 px-3 text-xs font-bold text-zinc-550 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>

          {/* Events rendering list */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 px-1">Upcoming Events</h2>
            
            {events.isLoading && (
              <div className="py-12 text-center text-sm text-zinc-550">
                <Loader2 className="animate-spin w-6 h-6 text-zinc-500 mx-auto mb-2" />
                Loading events...
              </div>
            )}
            {events.error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-3xl text-sm">
                {events.error.message}
              </div>
            )}

            {events.data && (
              <div className="flex flex-col gap-3.5 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                {events.data.length === 0 ? (
                  <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10">
                    <CalendarIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
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
                        className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
                          isExpanded 
                            ? "bg-zinc-100/80 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 shadow-xs" 
                            : "bg-white dark:bg-zinc-950 border-zinc-200/80 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Time & Date Column (Left) */}
                          <div className="flex flex-col items-center justify-center w-20 flex-shrink-0 text-center select-none">
                            <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-wider">
                              {eventDateLabel}
                            </span>
                            <span className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100 mt-0.5">
                              {startHours.replace(" AM", "").replace(" PM", "")}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-400 uppercase tracking-tight">
                              {startHours.endsWith("PM") ? "PM" : "AM"}
                            </span>
                          </div>

                          {/* Vertical Divider */}
                          <div className="w-px h-10 bg-zinc-200 dark:bg-zinc-800 self-center" />

                          {/* Details Column (Right) */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-sm font-extrabold text-zinc-950 dark:text-zinc-100 truncate leading-snug">
                                {titleText}
                              </h3>
                              <ChevronRight
                                className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transform transition-transform flex-shrink-0 ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                              />
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1">
                              {/* Event Duration/When */}
                              <span className="text-[11px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                                {formatEventWhen(event.start, event.end)}
                              </span>

                              {/* Location */}
                              {event.location && (
                                <span className="text-[11px] font-semibold text-zinc-550 dark:text-zinc-400 flex items-center gap-1 max-w-[200px] truncate">
                                  <MapPin className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                                  <span className="truncate">{event.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Info Area */}
                        {isExpanded && (
                          <div className="mt-4 pl-24 pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                            {event.description && (
                              <div>
                                <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Description</h4>
                                <div className="text-xs text-zinc-650 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-light">
                                  <LinkifiedText text={event.description} />
                                </div>
                              </div>
                            )}
                            
                            {event.attendees && event.attendees.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Attendees</h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {event.attendees.map((att, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-2.5 py-0.5 rounded-full border font-semibold bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                                      title={att}
                                    >
                                      {att}
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
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-zinc-650" />
            Schedule New Event
          </h2>
          
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Event Title
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Marketing sync meeting"
                className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Agenda, notes, etc."
                rows={3}
                className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-3xl px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all resize-y placeholder-zinc-400 dark:placeholder-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Google Meet or Office conference room"
                className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Start Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-3 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  End Date/Time
                </label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-3 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Attendees
              </label>
              <input
                type="text"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="email1@test.com, email2@test.com"
                className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-500"
              />
              <p className="text-[10px] text-zinc-450 dark:text-zinc-500 mt-1 pl-1">
                Enter email addresses separated by commas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => createDraft.mutate(eventInput)}
                disabled={createDraft.isPending || !summary || !start || !end}
                className="flex-1 px-5 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:bg-zinc-50 dark:disabled:bg-zinc-950 rounded-full transition-all shadow-xs cursor-pointer"
              >
                {createDraft.isPending ? "Creating..." : "Save Draft"}
              </button>
              
              <button
                type="button"
                onClick={() => sendInvite.mutate(eventInput)}
                disabled={sendInvite.isPending || !summary || !start || !end}
                className="flex-1 px-5 py-2.5 text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                {sendInvite.isPending ? "Inviting..." : "Send Invite"}
              </button>
            </div>

            {(createDraft.error ?? sendInvite.error) && (
              <p className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-3xl text-xs">
                {(createDraft.error ?? sendInvite.error)?.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
