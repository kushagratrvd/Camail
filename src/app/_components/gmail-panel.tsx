"use client";

import { useState } from "react";
import {
  formatMessageDate,
  formatSender,
  LinkifiedText,
  parseEmailAddress,
} from "@/lib/display";
import { api } from "@/trpc/react";
import { Mail, RefreshCw, Search as SearchIcon, Send, PenTool, ChevronLeft, Reply } from "lucide-react";

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
    return "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-800/50";
  };

  return (
    <div className="flex flex-col gap-6 w-full min-h-[600px] text-zinc-800 dark:text-zinc-100">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 p-4 rounded-3xl shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setView("inbox");
              setSelectedId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${
              view === "inbox"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-605 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Inbox
          </button>
          <button
            onClick={() => {
              setView("drafts");
              setSelectedId(null);
            }}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer ${
              view === "drafts"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                : "text-zinc-605 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setShowCompose(!showCompose)}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all border cursor-pointer ${
              showCompose
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-805 border-zinc-200 dark:border-zinc-800"
            }`}
          >
            {showCompose ? "Cancel" : "Compose"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshInbox.mutate()}
            disabled={refreshInbox.isPending}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-950 rounded-full transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshInbox.isPending ? "animate-spin" : ""}`} />
            {refreshInbox.isPending ? "Syncing..." : "Sync from Gmail"}
          </button>
          {refreshInbox.data && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800">
              {refreshInbox.data.synced} synced
            </span>
          )}
        </div>
      </div>

      {/* Main Panel Content Split-screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col gap-4">
          {view === "inbox" && (
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
                  placeholder="Search emails..."
                  className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-10 pr-3 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 rounded-full outline-none"
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
          )}

          {/* Inbox render list */}
          {view === "inbox" && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 px-1">Inbox</h2>
              {emails.isLoading && (
                <div className="py-12 text-center text-sm text-zinc-500">
                  <div className="animate-spin w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading emails...
                </div>
              )}
              {emails.error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-sm">
                  {emails.error.message}
                </div>
              )}
              {emails.data && (
                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {emails.data.length === 0 ? (
                    <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10">
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
                          className={`flex items-start gap-3 p-3.5 rounded-3xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-zinc-150/80 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 shadow-sm"
                              : "bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-sm ${getAvatarBg(
                              initial
                            )}`}
                          >
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline gap-2 mb-1">
                              <span className="text-xs font-bold text-zinc-800 dark:text-white truncate">
                                {formatSender(email.from) || "Unknown"}
                              </span>
                              {email.date && (
                                <span className="text-[10px] text-zinc-450 dark:text-zinc-500 whitespace-nowrap">
                                  {formatMessageDate(email.date)}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate mb-1">
                              {email.subject || "(no subject)"}
                            </h4>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 line-clamp-2 leading-relaxed">
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
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 px-1">Drafts</h2>
              {drafts.isLoading && (
                <div className="py-12 text-center text-sm text-zinc-500">
                  <div className="animate-spin w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading drafts...
                </div>
              )}
              {drafts.error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-sm">
                  {drafts.error.message}
                </div>
              )}
              {drafts.data && (
                <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                  {drafts.data.length === 0 ? (
                    <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50/50 dark:bg-zinc-900/10">
                      No drafts found.
                    </div>
                  ) : (
                    drafts.data.map((draft) => (
                      <div
                        key={draft.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-900 rounded-3xl transition-all shadow-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1">
                            Draft ID: {draft.id}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => sendDraft.mutate({ draftId: draft.id })}
                          disabled={sendDraft.isPending}
                          className="px-3.5 py-1.5 text-xs font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 rounded-full shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
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
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-md relative overflow-hidden transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 dark:bg-zinc-100"></div>
              <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-zinc-650" />
                Compose New Email
              </h2>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    To
                  </label>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter subject line"
                    className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Message
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    rows={6}
                    className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-3xl px-4 py-3 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all resize-y"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => createDraft.mutate({ to, subject, body })}
                    disabled={createDraft.isPending || !to || !subject || !body}
                    className="px-5 py-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-205 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 disabled:bg-zinc-100 dark:disabled:bg-zinc-950 rounded-full transition-all shadow-xs cursor-pointer"
                  >
                    {createDraft.isPending ? "Saving..." : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendEmail.mutate({ to, subject, body })}
                    disabled={sendEmail.isPending || !to || !subject || !body}
                    className="px-5 py-2.5 text-sm font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer"
                  >
                    {sendEmail.isPending ? "Sending..." : "Send Message"}
                  </button>
                </div>
                {(createDraft.error ?? sendEmail.error) && (
                  <p className="p-3 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-xs">
                    {(createDraft.error ?? sendEmail.error)?.message}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Email Body Detail Viewer */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200/85 dark:border-zinc-900 rounded-3xl p-6 shadow-sm min-h-[400px] flex flex-col justify-start">
            {selectedId ? (
              <>
                <div className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-550 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all bg-zinc-100 dark:bg-zinc-900 px-3.5 py-1.5 rounded-full border border-transparent dark:border-zinc-800 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back to Inbox
                  </button>
                  {selectedEmail.data && (
                    <button
                      type="button"
                      onClick={() => {
                        setTo(parseEmailAddress(selectedEmail.data?.from || "").email);
                        setSubject(`Re: ${selectedEmail.data?.subject || ""}`);
                        setBody(`\n\n--- On ${selectedEmail.data?.date ? new Date(selectedEmail.data.date).toLocaleString() : ""}, ${selectedEmail.data?.from || ""} wrote:\n> ${selectedEmail.data?.body || ""}`);
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 transition-all bg-zinc-100 dark:bg-zinc-800 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      Reply
                    </button>
                  )}
                </div>

                {selectedEmail.isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-sm text-zinc-450">
                    <div className="animate-spin w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full mb-2"></div>
                    Retrieving email content...
                  </div>
                )}
                {selectedEmail.error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-2xl text-sm">
                    {selectedEmail.error.message}
                  </div>
                )}
                {selectedEmail.data && (
                  <div className="space-y-6">
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold shadow-sm ${getAvatarBg(
                            getInitials(selectedEmail.data.from)
                          )}`}
                        >
                          {getInitials(selectedEmail.data.from)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex flex-wrap items-center gap-1">
                            <span className="text-zinc-400 dark:text-zinc-500 font-semibold">From:</span>{" "}
                            {formatSender(selectedEmail.data.from)}
                          </div>
                          {selectedEmail.data.to && (
                            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-zinc-400 dark:text-zinc-500 font-semibold">To:</span>{" "}
                              {formatSender(selectedEmail.data.to)}
                            </div>
                          )}
                        </div>
                      </div>
                      {selectedEmail.data.date && (
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-semibold whitespace-nowrap self-end sm:self-center">
                          {formatMessageDate(selectedEmail.data.date)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-100 leading-tight">
                        {selectedEmail.data.subject || "(no subject)"}
                      </h2>
                      <hr className="border-zinc-100 dark:border-zinc-900" />
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pr-1 max-w-full">
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
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-50/20 dark:bg-zinc-900/10 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                <Mail className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-300 mb-1">No email selected</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs leading-relaxed font-light">
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
