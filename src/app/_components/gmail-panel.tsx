"use client";

import { useState } from "react";
import {
  formatMessageDate,
  formatSender,
  LinkifiedText,
} from "@/lib/display";
import { api } from "@/trpc/react";

export function GmailPanel() {
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [view, setView] = useState<"inbox" | "drafts">("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  const utils = api.useUtils();

  const emails = api.gmail.searchEmails.useQuery(
    { query: activeSearch, limit: 50, offset: 0 },
    { enabled: view === "inbox" },
  );

  const selectedEmail = api.gmail.getMessage.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );

  const drafts = api.gmail.listDrafts.useQuery(
    { limit: 50, offset: 0 },
    { enabled: view === "drafts" },
  );

  const refreshInbox = api.gmail.refreshInbox.useMutation({
    onSuccess: async () => {
      await utils.gmail.searchEmails.invalidate();
      await utils.gmail.listDrafts.invalidate();
    },
  });

  const createDraft = api.gmail.createDraft.useMutation({
    onSuccess: async () => {
      await utils.gmail.listDrafts.invalidate();
      setTo("");
      setSubject("");
      setBody("");
      setShowCompose(false);
    },
  });

  const sendEmail = api.gmail.sendEmail.useMutation({
    onSuccess: async () => {
      await utils.gmail.searchEmails.invalidate();
      setTo("");
      setSubject("");
      setBody("");
      setShowCompose(false);
    },
  });

  const sendDraft = api.gmail.sendDraft.useMutation({
    onSuccess: async () => {
      await utils.gmail.searchEmails.invalidate();
      await utils.gmail.listDrafts.invalidate();
    },
  });

  const getInitials = (sender: string | null) => {
    if (!sender) return "E";
    const clean = sender.replace(/<.*>/, "").trim();
    return clean.charAt(0).toUpperCase();
  };

  const getAvatarBg = (initial: string) => {
    const code = initial.charCodeAt(0) % 5;
    const gradients = [
      "from-purple-500 to-indigo-500",
      "from-pink-500 to-rose-500",
      "from-blue-500 to-teal-500",
      "from-emerald-500 to-teal-500",
      "from-amber-500 to-orange-500",
    ];
    return gradients[code] || gradients[0];
  };

  return (
    <div className="flex flex-col gap-6 w-full min-h-[600px] text-gray-800 dark:text-gray-100">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-gray-950/70 border border-gray-200/80 dark:border-gray-900 p-4 rounded-2xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setView("inbox");
              setSelectedId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              view === "inbox"
                ? "bg-gray-900 dark:bg-gray-800 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Inbox
          </button>
          <button
            onClick={() => {
              setView("drafts");
              setSelectedId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              view === "drafts"
                ? "bg-gray-900 dark:bg-gray-800 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all border cursor-pointer ${
              showCompose
                ? "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/50"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800"
            }`}
          >
            {showCompose ? "Cancel" : "Compose"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshInbox.mutate()}
            disabled={refreshInbox.isPending}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-950 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshInbox.isPending ? "animate-spin" : ""}`}
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
            {refreshInbox.isPending ? "Syncing..." : "Sync from Gmail"}
          </button>
          {refreshInbox.data && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-transparent dark:border-gray-800">
              {refreshInbox.data.synced} synced
            </span>
          )}
        </div>
      </div>

      {/* Main Panel Content Split-screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          {view === "inbox" && (
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
                  placeholder="Search emails..."
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-9 pr-3 text-gray-800 dark:text-gray-100 placeholder-gray-400 rounded-xl outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-10 px-4 text-xs font-bold text-white bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-xl shadow-sm transition-all cursor-pointer"
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
          )}

          {/* Inbox render list */}
          {view === "inbox" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 px-1">Inbox</h2>
              {emails.isLoading && (
                <div className="py-12 text-center text-sm text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading emails...
                </div>
              )}
              {emails.error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-sm">
                  {emails.error.message}
                </div>
              )}
              {emails.data && (
                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {emails.data.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                      No emails found. Click "Sync from Gmail" to fetch.
                    </div>
                  ) : (
                    emails.data.map((email) => {
                      const initial = getInitials(email.from);
                      const isSelected = selectedId === email.id;
                      return (
                        <div
                          key={email.id}
                          onClick={() => {
                            setSelectedId(email.id);
                            setShowCompose(false);
                          }}
                          className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/60 shadow-sm"
                              : "bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-900 hover:border-gray-300 dark:hover:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-900/50"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br ${getAvatarBg(
                              initial
                            )} shadow-sm`}
                          >
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2 mb-1">
                              <span className="text-xs font-bold text-gray-800 dark:text-white truncate">
                                {formatSender(email.from) || "Unknown"}
                              </span>
                              {email.date && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                  {formatMessageDate(email.date)}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate mb-1">
                              {email.subject || "(no subject)"}
                            </h4>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">
                              {email.snippet}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drafts render list */}
          {view === "drafts" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 px-1">Drafts</h2>
              {drafts.isLoading && (
                <div className="py-12 text-center text-sm text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading drafts...
                </div>
              )}
              {drafts.error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-sm">
                  {drafts.error.message}
                </div>
              )}
              {drafts.data && (
                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {drafts.data.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                      No drafts found.
                    </div>
                  ) : (
                    drafts.data.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 hover:border-gray-300 dark:hover:border-gray-800 rounded-2xl transition-all shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                            Draft ID: {draft.id}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendDraft.mutate({ draftId: draft.id })}
                          disabled={sendDraft.isPending}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          {sendDraft.isPending ? "Sending..." : "Send"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          {/* Compose Form overlay/card */}
          {showCompose && (
            <div className="bg-white dark:bg-gray-950 border border-purple-150 dark:border-purple-900/50 rounded-3xl p-6 shadow-md relative overflow-hidden transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600 dark:bg-purple-500"></div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Compose New Email
              </h2>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    To
                  </label>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all resize-y"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => createDraft.mutate({ to, subject, body })}
                    disabled={createDraft.isPending || !to || !subject || !body}
                    className="px-5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-950 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    {createDraft.isPending ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendEmail.mutate({ to, subject, body })}
                    disabled={sendEmail.isPending || !to || !subject || !body}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {sendEmail.isPending ? "Sending..." : "Send Message"}
                  </button>
                </div>
                {(createDraft.error ?? sendEmail.error) && (
                  <p className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-xs">
                    {(createDraft.error ?? sendEmail.error)?.message}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Email Body Detail Viewer */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col justify-start">
            {selectedId ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-900 pb-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all bg-gray-100 dark:bg-gray-900 px-3 py-1.5 rounded-lg border border-transparent dark:border-gray-800 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Inbox
                  </button>
                  {selectedEmail.data && (
                    <button
                      type="button"
                      onClick={() => {
                        setTo(formatSender(selectedEmail.data?.from) || "");
                        setSubject(`Re: ${selectedEmail.data?.subject || ""}`);
                        setBody(`\n\n--- On ${selectedEmail.data?.date ? new Date(selectedEmail.data.date).toLocaleString() : ""}, ${selectedEmail.data?.from || ""} wrote:\n> ${selectedEmail.data?.body || ""}`);
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-all bg-purple-50 dark:bg-purple-950/20 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/50 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Reply
                    </button>
                  )}
                </div>

                {selectedEmail.isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-sm text-gray-400">
                    <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mb-2"></div>
                    Retrieving email content...
                  </div>
                )}
                {selectedEmail.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl text-sm">
                    {selectedEmail.error.message}
                  </div>
                )}
                {selectedEmail.data && (
                  <div className="space-y-6">
                    <div className="bg-gray-50/50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br ${getAvatarBg(
                            getInitials(selectedEmail.data.from)
                          )} shadow-sm`}
                        >
                          {getInitials(selectedEmail.data.from)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex flex-wrap items-center gap-1">
                            <span className="text-gray-400 dark:text-gray-500 font-semibold">From:</span>{" "}
                            {formatSender(selectedEmail.data.from)}
                          </div>
                          {selectedEmail.data.to && (
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-gray-400 dark:text-gray-500 font-semibold">To:</span>{" "}
                              {formatSender(selectedEmail.data.to)}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedEmail.data.date && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 font-semibold whitespace-nowrap self-end sm:self-center">
                          {formatMessageDate(selectedEmail.data.date)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                        {selectedEmail.data.subject || "(no subject)"}
                      </h2>
                      <hr className="border-gray-100 dark:border-gray-900" />
                      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed pr-1 max-w-full">
                        <LinkifiedText
                          text={
                            selectedEmail.data.body ||
                            selectedEmail.data.snippet ||
                            "(empty)"
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/20 dark:bg-gray-900/10 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-3xl">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5" />
                </svg>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-300 mb-1">No email selected</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs leading-relaxed">
                  Select an email from your Inbox to view its contents, or hit Compose to write a new email draft.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
