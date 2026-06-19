"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { z } from "zod";
import { Mail, Calendar, Check, ShieldCheck, Loader2 } from "lucide-react";

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
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar bg-white dark:bg-[#0f0e13]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Settings
          </h1>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mt-1 font-light">
            Manage your account profiles, connected services, and AI credentials.
          </p>
        </div>

        {isSaved && (
          <div className="fixed bottom-6 right-6 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-zinc-800 dark:border-zinc-200/50 animate-bounce z-50">
            <Check className="w-4 h-4" />
            Settings saved successfully!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Account Profile & OAuth Status */}
          <div className="md:col-span-5 space-y-6">
            {/* Account Profile Card */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 dark:bg-zinc-100"></div>
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider mb-4">
                User Profile
              </h2>
              {isPending ? (
                <div className="py-6 flex items-center justify-center">
                  <Loader2 className="animate-spin w-5 h-5 text-zinc-500" />
                </div>
              ) : session?.user ? (
                <div className="flex items-center gap-4">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name}
                      className="w-14 h-14 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-900 dark:text-zinc-100 text-lg shadow-sm border border-zinc-200 dark:border-zinc-700">
                      {getInitials(session.user.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base truncate">
                      {session.user.name}
                    </h3>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 truncate mt-0.5 font-light">
                      {session.user.email}
                    </p>
                    <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800">
                      Google Logged In
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-zinc-400">Not signed in</p>
                </div>
              )}
            </div>

            {/* Connection Integrations */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider mb-4">
                Integrations Status
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-805 dark:text-zinc-200">Gmail Plugin</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-light">Read, write and search cached DB</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-sm" title="Connected" />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-805 dark:text-zinc-200">Google Calendar</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-light">Weekly views and event invites</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 shadow-sm" title="Connected" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Model Credentials & Config */}
          <div className="md:col-span-7 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-wider">
              AI Agent Configuration
            </h2>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-bold text-zinc-550 dark:text-zinc-450 uppercase tracking-wider mb-2">
                Active AI Agent Model
              </label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all font-semibold text-zinc-700 dark:text-zinc-205 cursor-pointer appearance-none"
                >
                  <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="openai/gpt-5.4">GPT-5.4</option>
                  <option value="openai/gpt-5.2">GPT-5.2</option>
                  <option value="anthropic/claude-opus-4.7">Claude Opus 4.7</option>
                  <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</option>
                </select>
              </div>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed font-light">
                The agent will use this model context to answer your requests. Each provider requires a valid API key configured below.
              </p>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* Custom Instructions / Templates */}
            <div>
              <label className="block text-xs font-bold text-zinc-550 dark:text-zinc-455 uppercase tracking-wider mb-2">
                Custom Instructions & Templates
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => handleInstructionsChange(e.target.value)}
                rows={4}
                className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-805 dark:text-zinc-100 rounded-3xl px-4 py-3.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600 font-light custom-scrollbar"
                placeholder="e.g. Always write emails in a professional, brief, and polite tone. Sign off with 'Best regards, Kush'."
              />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed font-light">
                Add global instructions or templates (e.g. writing styles, email structures, templates) that the AI agent should always follow.
              </p>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-900" />

            {/* API Keys */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                API Key Credentials
              </h3>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Google API Key (for Gemini)
                </label>
                <input
                  type="password"
                  value={customKeys.google || ""}
                  onChange={(e) => handleKeyChange("google", e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                  placeholder="AIzaSy..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  OpenAI API Key (for GPT-5)
                </label>
                <input
                  type="password"
                  value={customKeys.openai || ""}
                  onChange={(e) => handleKeyChange("openai", e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                  placeholder="sk-proj-..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Anthropic API Key (for Claude)
                </label>
                <input
                  type="password"
                  value={customKeys.anthropic || ""}
                  onChange={(e) => handleKeyChange("anthropic", e.target.value)}
                  className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                  placeholder="sk-ant-..."
                />
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed bg-zinc-50/50 dark:bg-[#0f0e13]/60 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-zinc-650 flex-shrink-0 mt-0.5" />
              <p className="font-light">
                <strong>Privacy Notice:</strong> API keys are saved exclusively in your browser's <code>localStorage</code> and never sent directly to our database. Requests are processed directly via secure client pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
