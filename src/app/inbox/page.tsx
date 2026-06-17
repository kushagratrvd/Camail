"use client";

import { GmailPanel } from "@/app/_components/gmail-panel";
import { useSession } from "@/lib/auth-client";

export default function InboxPage() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-2xl p-8 max-w-sm text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Please sign in to access your Gmail Inbox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 bg-gray-50/30 dark:bg-gray-950/20 custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full">
        <GmailPanel />
      </div>
    </div>
  );
}
