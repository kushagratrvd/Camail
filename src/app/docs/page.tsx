"use client";

import { useState } from "react";
import Link from "next/link";

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState<string | null>(null);

  interface ApiEndpoint {
    path: string;
    method: string;
    summary: string;
    description: string;
    parameters: { name: string; required: boolean; type: string; desc: string }[];
    requestBody: string;
    responses: { status: string; desc: string; example?: string }[];
  }

  const apiEndpoints: ApiEndpoint[] = [
    {
      path: "/api/chat",
      method: "POST",
      summary: "AI Agent Chat & Execution Loop",
      description: "Submit multi-turn dialogue messages to interact with the AI assistant. The agent accesses Gmail and Google Calendar tools in-process, executing user intents using the provided Bring-Your-Own-Key (BYOK) LLM keys.",
      parameters: [],
      requestBody: `{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Summarize my last 3 unread emails"
    }
  ],
  "model": "gemini-2.5-flash",
  "keys": {
    "google": "AIzaSy...",
    "openai": "sk-...",
    "anthropic": "sk-ant-..."
  }
}`,
      responses: [
        { status: "200 OK", desc: "SSE Stream (text/event-stream) of generated AI message chunks." },
        { status: "401 Unauthorized", desc: "Missing user session credentials." },
        { status: "429 Too Many Requests", desc: "Daily quota limits exceeded." }
      ]
    },
    {
      path: "/api/auth/sync",
      method: "POST",
      summary: "Sync Integration Credentials",
      description: "Triggers manual synchronizations of the user's cached Gmail messages and Google Calendar events from Google Cloud. Checks and increments the daily manual sync quota.",
      parameters: [],
      requestBody: "None",
      responses: [
        { status: "200 OK", desc: "Synchronization initiated successfully.", example: `{\n  "success": true\n}` },
        { status: "401 Unauthorized", desc: "Missing session tenantId." },
        { status: "429 Too Many Requests", desc: "Daily synchronization quota reached (Max 10 syncs/day).", example: `{\n  "error": "Daily sync limit reached. You can only sync 10 times per day."\n}` }
      ]
    },
    {
      path: "/api/connect",
      method: "GET",
      summary: "Initiate Integration OAuth Pipeline",
      description: "Generates OAuth consent flow redirections to link Google Accounts. Redirects the user directly to the Google authorization flow.",
      parameters: [
        { name: "plugin", required: true, type: "string (gmail | googlecalendar)", desc: "Target service plugin identifier." },
        { name: "tenantId", required: true, type: "string", desc: "Current user identifier associated with the request." }
      ],
      requestBody: "None",
      responses: [
        { status: "302 Found", desc: "Redirect pipeline setup successfully. Redirects to Google consent screen." },
        { status: "400 Bad Request", desc: "Invalid request parameters. Missing plugin or tenantId." }
      ]
    },
    {
      path: "/api/webhooks",
      method: "POST",
      summary: "Google push notifications webhook",
      description: "Receiver endpoint for Gmail Pub/Sub messages and Google Calendar push notification webhooks.",
      parameters: [],
      requestBody: "Google Cloud Pub/Sub / push body payload (varies by integration)",
      responses: [
        { status: "200 OK", desc: "Webhook acknowledgement." }
      ]
    }
  ];

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
    {
      id: "api-reference",
      title: "API Reference",
      description: "OpenAPI endpoints schema explorer for developer integrations.",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl p-4 gap-4">
            <div className="text-left">
              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200">OpenAPI 3.0 Specification</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Integrate Camail's assistant routes in your own tooling.</p>
            </div>
            <a href="/openapi.json" download="openapi.json" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer inline-block text-center whitespace-nowrap">
              Download spec (openapi.json)
            </a>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            Here are the primary HTTP endpoints exposed by Camail. Click on an endpoint to expand its detailed schema:
          </p>

          <div className="space-y-3">
            {apiEndpoints.map((ep) => {
              const isOpen = activeEndpoint === ep.path;
              const isPost = ep.method === "POST";
              return (
                <div key={ep.path} className="border border-gray-200 dark:border-gray-900 rounded-2xl overflow-hidden bg-gray-50/20 dark:bg-gray-950">
                  <button
                    onClick={() => setActiveEndpoint(isOpen ? null : ep.path)}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-900/40 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md tracking-wider ${
                        isPost 
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/50 dark:border-purple-900/50" 
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50"
                      }`}>
                        {ep.method}
                      </span>
                      <code className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100">{ep.path}</code>
                      <span className="text-xs text-gray-400 dark:text-gray-505 hidden sm:inline">—</span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 hidden sm:inline">{ep.summary}</span>
                    </div>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="px-5 py-4 border-t border-gray-150 dark:border-gray-900 bg-white dark:bg-[#0f0e13]/60 space-y-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{ep.description}</p>

                      {ep.parameters.length > 0 && (
                        <div>
                          <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-2">Query Parameters</h5>
                          <div className="border border-gray-100 dark:border-gray-900 rounded-xl overflow-hidden text-xs">
                            <table className="w-full border-collapse text-left">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-bold uppercase text-gray-400">
                                  <th className="px-4 py-2">Parameter</th>
                                  <th className="px-4 py-2">Type</th>
                                  <th className="px-4 py-2">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                                {ep.parameters.map((p) => (
                                  <tr key={p.name}>
                                    <td className="px-4 py-2 font-mono font-semibold text-purple-600 dark:text-purple-400">
                                      {p.name} {p.required && <span className="text-red-500">*</span>}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 dark:text-gray-400 font-mono text-[10px]">{p.type}</td>
                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{p.desc}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {ep.requestBody !== "None" && (
                        <div>
                          <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-2">Request Body (JSON)</h5>
                          <pre className="p-3 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-900 rounded-xl text-[10px] font-mono text-purple-700 dark:text-purple-300 overflow-x-auto whitespace-pre-wrap">
                            {ep.requestBody}
                          </pre>
                        </div>
                      )}

                      <div>
                        <h5 className="text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-wide mb-2">Responses</h5>
                        <div className="space-y-2.5">
                          {ep.responses.map((r) => (
                            <div key={r.status} className="text-xs space-y-1.5">
                              <div className="flex gap-2">
                                <span className={`font-mono font-bold ${
                                  r.status.startsWith('2') || r.status.startsWith('3')
                                    ? 'text-emerald-600 dark:text-emerald-400' 
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}>{r.status}</span>
                                <span className="text-gray-500 dark:text-gray-400">— {r.desc}</span>
                              </div>
                              {r.example && (
                                <pre className="p-2 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-900 rounded-lg text-[9px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto">
                                  {r.example}
                                </pre>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
