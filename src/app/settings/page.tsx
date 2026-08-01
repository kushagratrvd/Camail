"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/trpc/react";
import { Mail, Calendar, Check, ShieldCheck, Loader2, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();

  // Non-secret settings (still in localStorage)
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [customInstructions, setCustomInstructions] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // API key form inputs (only held in state during editing, never persisted client-side)
  const [googleKey, setGoogleKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  // Integration Status
  const {
    data: statusData,
    refetch: refetchIntegrations,
  } = api.integrations.getStatus.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: (query: { state: { data?: { gmail?: { status: string }; calendar?: { status: string } } } }) => {
      // Poll every 3 seconds if any integration is in SYNCING state
      const data = query.state.data;
      if (data?.gmail?.status === "SYNCING" || data?.calendar?.status === "SYNCING") {
        return 3000;
      }
      return false;
    },
  });

  const disconnectMutation = api.integrations.disconnect.useMutation({
    onSuccess: () => {
      refetchIntegrations();
    },
  });

  // Server-side key status
  const {
    data: keyStatus,
    isLoading: isKeyStatusLoading,
    refetch: refetchKeyStatus,
  } = api.apiKeys.getKeyStatus.useQuery(undefined, {
    enabled: !!session,
  });

  const saveKeysMutation = api.apiKeys.saveKeys.useMutation({
    onSuccess: () => {
      setGoogleKey("");
      setOpenaiKey("");
      setAnthropicKey("");
      refetchKeyStatus();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    },
    onSettled: () => setIsSavingKeys(false),
  });

  const deleteKeysMutation = api.apiKeys.deleteKeys.useMutation({
    onSuccess: () => {
      refetchKeyStatus();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    },
  });

  const renderStatusBadge = (
    integration: { status: string; accountEmail: string | null; error: string | null } | undefined,
    pluginName: "gmail" | "googlecalendar"
  ) => {
    switch (integration?.status) {
      case "CONNECTED":
        return (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Connected {integration.accountEmail ? `(${integration.accountEmail})` : ""}
            </span>
            <button
              onClick={() => disconnectMutation.mutate({ plugin: pluginName })}
              disabled={disconnectMutation.isPending}
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        );
      case "SYNCING":
        return (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Syncing...
            </span>
            <button
              onClick={() => disconnectMutation.mutate({ plugin: pluginName })}
              disabled={disconnectMutation.isPending}
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        );
      case "RECONNECT_REQUIRED":
        return (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              Reconnect Required
            </span>
            <a
              href={`/api/connect?plugin=${pluginName}&tenantId=${session?.user?.id}`}
              className="text-xs text-blue-500 hover:underline font-bold px-2 py-1"
            >
              Reconnect
            </a>
            <button
              onClick={() => disconnectMutation.mutate({ plugin: pluginName })}
              disabled={disconnectMutation.isPending}
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        );
      case "ERROR":
        return (
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full border border-red-200 dark:border-red-800"
              title={integration.error || ""}
            >
              Sync Error
            </span>
            <a
              href={`/api/connect?plugin=${pluginName}&tenantId=${session?.user?.id}`}
              className="text-xs text-blue-500 hover:underline font-bold px-2 py-1"
            >
              Retry
            </a>
            <button
              onClick={() => disconnectMutation.mutate({ plugin: pluginName })}
              disabled={disconnectMutation.isPending}
              className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        );
      case "DISCONNECTED":
      default:
        return (
          <a
            href={`/api/connect?plugin=${pluginName}&tenantId=${session?.user?.id}`}
            className="text-xs font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 transition-colors shadow-xs"
          >
            Connect
          </a>
        );
    }
  };

  useEffect(() => {
    try {
      const savedModel = localStorage.getItem("corsair_selected_model");
      if (savedModel) setSelectedModel(savedModel);

      const savedInstructions = localStorage.getItem("corsair_custom_instructions");
      if (savedInstructions) setCustomInstructions(savedInstructions);
    } catch (e) {
      console.error("Failed to parse settings from local storage", e);
    }
  }, []);

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

  const handleSaveKeys = () => {
    // Only send non-empty keys
    const payload: { google?: string; openai?: string; anthropic?: string } = {};
    if (googleKey.trim()) payload.google = googleKey.trim();
    if (openaiKey.trim()) payload.openai = openaiKey.trim();
    if (anthropicKey.trim()) payload.anthropic = anthropicKey.trim();

    if (Object.keys(payload).length === 0) return;

    setIsSavingKeys(true);
    saveKeysMutation.mutate(payload);
  };

  const handleDeleteKeys = () => {
    deleteKeysMutation.mutate();
  };

  const hasAnyKey = keyStatus && (keyStatus.google || keyStatus.openai || keyStatus.anthropic);

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
                {/* Gmail Integration */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-805 dark:text-zinc-200">Gmail</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-light">Read, summarize, and draft emails</p>
                    </div>
                  </div>
                  <div>
                    {renderStatusBadge(statusData?.gmail, "gmail")}
                  </div>
                </div>

                {/* Calendar Integration */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center border border-zinc-200/50 dark:border-zinc-700/50">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-805 dark:text-zinc-200">Google Calendar</h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500 font-light">Schedule events and check availability</p>
                    </div>
                  </div>
                  <div>
                    {renderStatusBadge(statusData?.calendar, "googlecalendar")}
                  </div>
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
              <Select
                value={selectedModel}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                  <SelectItem value="openai/gpt-5.4">GPT-5.4</SelectItem>
                  <SelectItem value="openai/gpt-5.2">GPT-5.2</SelectItem>
                  <SelectItem value="anthropic/claude-opus-4.7">Claude Opus 4.7</SelectItem>
                  <SelectItem value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</SelectItem>
                </SelectContent>
              </Select>
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

              {isKeyStatusLoading ? (
                <div className="py-4 flex items-center justify-center">
                  <Loader2 className="animate-spin w-4 h-4 text-zinc-500" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Google API Key (for Gemini)
                    </label>
                    {keyStatus?.google && !googleKey ? (
                      <div className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span className="font-mono">{keyStatus.google}</span>
                        <button
                          type="button"
                          onClick={() => setGoogleKey(" ")}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium uppercase tracking-wider transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <input
                        type="password"
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                        placeholder="AIzaSy..."
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      OpenAI API Key (for GPT-5)
                    </label>
                    {keyStatus?.openai && !openaiKey ? (
                      <div className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span className="font-mono">{keyStatus.openai}</span>
                        <button
                          type="button"
                          onClick={() => setOpenaiKey(" ")}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium uppercase tracking-wider transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <input
                        type="password"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                        placeholder="sk-proj-..."
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Anthropic API Key (for Claude)
                    </label>
                    {keyStatus?.anthropic && !anthropicKey ? (
                      <div className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2.5 text-sm text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span className="font-mono">{keyStatus.anthropic}</span>
                        <button
                          type="button"
                          onClick={() => setAnthropicKey(" ")}
                          className="text-[10px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium uppercase tracking-wider transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <input
                        type="password"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        className="w-full bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-400 dark:focus:border-zinc-650 focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder-zinc-400 dark:placeholder-zinc-600"
                        placeholder="sk-ant-..."
                      />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveKeys}
                      disabled={isSavingKeys || (!googleKey.trim() && !openaiKey.trim() && !anthropicKey.trim())}
                      className="px-5 py-2 rounded-full text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2"
                    >
                      {isSavingKeys && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save Keys
                    </button>

                    {hasAnyKey && (
                      <button
                        type="button"
                        onClick={handleDeleteKeys}
                        disabled={deleteKeysMutation.isPending}
                        className="px-4 py-2 rounded-full text-xs font-bold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                      >
                        {deleteKeysMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Delete All Keys
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed bg-zinc-50/50 dark:bg-[#0f0e13]/60 p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-zinc-650 flex-shrink-0 mt-0.5" />
              <p className="font-light">
                <strong>Privacy Notice:</strong> API keys are encrypted with AES-256-GCM and stored securely on our server. They are never stored in your browser or exposed in network requests.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
