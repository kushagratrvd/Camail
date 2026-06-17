"use client";

import Link from "next/link";

export default function DocsPage() {
  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn how to link your Google credentials and verify connections.",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Welcome to Camail! Follow these simple steps to hook up your Google Gmail and Calendar accounts to unleash the AI productivity agents:
          </p>
          <ol className="list-decimal pl-5 space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
            <li>
              Log in securely using your <strong>Google Workspace or Gmail Account</strong> via the Auth login button in the sidebar.
            </li>
            <li>
              Camail automatically registers your OAuth 2 secure token. We also establish background calendar and gmail webhook hooks to keep your inbox and agenda database cache fresh.
            </li>
            <li>
              Ensure your providers' API keys are setup in the <Link className="text-purple-600 dark:text-purple-400 font-bold hover:underline" href="/settings">Settings</Link> page so your AI model can query endpoints.
            </li>
          </ol>
        </div>
      ),
    },
    {
      id: "ai-capabilities",
      title: "AI Agent Capabilities",
      description: "What the agent can do, and how to command it.",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Your conversational agent has deep integration with your workspace database and Google Cloud APIs. Try using commands like:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-1.5">Gmail Management</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">Search messages, summarize threads, create drafts, and send responses.</p>
              <code className="text-[10px] bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-mono px-2 py-1 rounded border border-purple-100 dark:border-purple-900/50 block w-fit">
                "Read my last 3 unread emails"
              </code>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wide mb-1.5">Google Calendar</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-2">Check schedules, search events, book meetings, and send invites to guests.</p>
              <code className="text-[10px] bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-mono px-2 py-1 rounded border border-purple-100 dark:border-purple-900/50 block w-fit">
                "Schedule a meeting for tomorrow"
              </code>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "safety-privacy",
      title: "Data Safety & Privacy",
      description: "How your data is kept secure.",
      content: (
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p>
            Camail implements strict enterprise security measures to protect your account and email data:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li>
              <strong>Local API Keys:</strong> Custom provider API keys (OpenAI, Anthropic, DeepSeek) are saved directly inside your browser cache.
            </li>
            <li>
              <strong>Secure DEK Encryption:</strong> Integration credentials and tokens stored in the database are protected with a unique Data Encryption Key (DEK) wrapper.
            </li>
            <li>
              <strong>Google Limited Use Compliance:</strong> Camail adheres strictly to Google APIs Limited Use Requirements. Your data is never used to train LLMs or shared with advertisers.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "faq",
      title: "Frequently Asked Questions",
      description: "Answers to common queries.",
      content: (
        <div className="space-y-4">
          <div className="border-b border-gray-100 dark:border-gray-900 pb-3">
            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">How long does syncing take?</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Initial sync starts immediately after your Google account connection. Webhook push subscriptions keep your inbox cache fresh instantly.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">Can I delete my chat history?</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Yes, hover over a chat in the sidebar, click the three dots, and choose Delete. It deletes the chat thread instantly from the database.
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Documentation Portal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Guides, FAQs, and API capabilities for Camail AI Agent.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Sticky Quick Nav */}
          <div className="md:col-span-4 space-y-4 md:sticky md:top-8 bg-gray-50/50 dark:bg-gray-900/30 p-4 border border-gray-200 dark:border-gray-900 rounded-3xl">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">
              On This Page
            </h3>
            <nav className="flex flex-col gap-1">
              {sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-xl transition-all"
                >
                  {sec.title}
                </a>
              ))}
            </nav>
          </div>

          {/* Doc Content */}
          <div className="md:col-span-8 space-y-8">
            {sections.map((sec) => (
              <div
                key={sec.id}
                id={sec.id}
                className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm scroll-mt-8 space-y-4"
              >
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{sec.title}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sec.description}</p>
                </div>
                <hr className="border-gray-100 dark:border-gray-900" />
                <div>{sec.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
