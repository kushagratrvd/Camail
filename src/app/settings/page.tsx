"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { z } from "zod";

const CustomKeysSchema = z.object({
  google: z.string().optional(),
  openai: z.string().optional(),
  anthropic: z.string().optional(),
});

type CustomKeys = z.infer<typeof CustomKeysSchema>;

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const [customKeys, setCustomKeys] = useState<CustomKeys>({});
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    try {
      const savedModel = localStorage.getItem("corsair_selected_model");
      if (savedModel) setSelectedModel(savedModel);

      const savedKeys = localStorage.getItem("corsair_custom_keys");
      if (savedKeys) {
        const parsed = CustomKeysSchema.safeParse(JSON.parse(savedKeys));
        if (parsed.success) {
          setCustomKeys(parsed.data);
        }
      }

      const savedInstructions = localStorage.getItem("corsair_custom_instructions");
      if (savedInstructions) setCustomInstructions(savedInstructions);
    } catch (e) {
      console.error("Failed to parse settings from local storage", e);
    }
  }, []);

  const handleKeyChange = (provider: keyof CustomKeys, val: string) => {
    const newKeys = { ...customKeys, [provider]: val };
    setCustomKeys(newKeys);
    localStorage.setItem("corsair_custom_keys", JSON.stringify(newKeys));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleModelChange = (val: string) => {
    setSelectedModel(val);
    localStorage.setItem("corsair_selected_model", val);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleInstructionsChange = (val: string) => {
    setCustomInstructions(val);
    localStorage.setItem("corsair_custom_instructions", val);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your account profiles, connected services, and AI credentials.
          </p>
        </div>

        {isSaved && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce z-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            Settings saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Account Profile & OAuth Status */}
          <div className="md:col-span-5 space-y-6">
            {/* Account Profile Card */}
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider mb-4">
                User Profile
              </h2>
              {isPending ? (
                <div className="py-6 flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                </div>
              ) : session?.user ? (
                <div className="flex items-center gap-4">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-purple-100 dark:border-purple-900 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white dark:text-gray-100 text-lg shadow-sm">
                      {getInitials(session.user.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base truncate">
                      {session.user.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {session.user.email}
                    </p>
                    <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50">
                      Google Logged In
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400">Not signed in</p>
                </div>
              )}
            </div>

            {/* Connection Integrations */}
            <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider mb-4">
                Integrations Status
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Gmail Plugin</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Read, write and search cached DB</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title="Connected" />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Google Calendar</h4>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Weekly views and event invites</p>
                    </div>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" title="Connected" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Model Credentials & Config */}
          <div className="md:col-span-7 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">
              AI Agent Configuration
            </h2>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-2">
                Active AI Agent Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all font-medium text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="openai/gpt-5.4">GPT-5.4</option>
                <option value="openai/gpt-5.2">GPT-5.2</option>
                <option value="anthropic/claude-opus-4.7">Claude Opus 4.7</option>
                <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</option>
              </select>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                The agent will use this model context to answer your requests. Each provider requires a valid API key configured below.
              </p>
            </div>

            <hr className="border-gray-100 dark:border-gray-900" />

            {/* Custom Instructions / Templates */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-450 uppercase tracking-wider mb-2">
                Custom Instructions & Templates
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => handleInstructionsChange(e.target.value)}
                rows={4}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-600 font-medium custom-scrollbar"
                placeholder="e.g. Always write emails in a professional, brief, and polite tone. Sign off with 'Best regards, Kush'."
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
                Add global instructions or templates (e.g. writing styles, email structures, templates) that the AI agent should always follow.
              </p>
            </div>

            <hr className="border-gray-100 dark:border-gray-900" />

            {/* API Keys */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                API Key Credentials
              </h3>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Google API Key (for Gemini)
                </label>
                <input
                  type="password"
                  value={customKeys.google || ""}
                  onChange={(e) => handleKeyChange("google", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OpenAI API Key (for GPT-5)
                </label>
                <input
                  type="password"
                  value={customKeys.openai || ""}
                  onChange={(e) => handleKeyChange("openai", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="sk-proj-..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Anthropic API Key (for Claude)
                </label>
                <input
                  type="password"
                  value={customKeys.anthropic || ""}
                  onChange={(e) => handleKeyChange("anthropic", e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-400 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                  placeholder="sk-ant-..."
                  />
              </div>
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800">
              ⚡ <strong>Privacy Notice:</strong> API keys are saved exclusively in your browser's <code>localStorage</code> and never sent directly to our database. Requests are processed directly via secure client pipelines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
