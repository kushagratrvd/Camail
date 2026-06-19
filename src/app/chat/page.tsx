"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useChat, type UIMessage } from '@ai-sdk/react';
import { api } from "@/trpc/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { z } from "zod";
import Link from "next/link";
import {
  Mail,
  Calendar as CalendarIcon,
  PenTool,
  Mic,
  ArrowUp,
  Settings as SettingsIcon,
  ChevronDown,
  Loader2,
  Paperclip
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const CustomKeysSchema = z.object({
  google: z.string().optional(),
  openai: z.string().optional(),
  anthropic: z.string().optional(),
});

type CustomKeys = z.infer<typeof CustomKeysSchema>;

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentChatId = searchParams.get('chatId');
  const activeChatId = useRef<string | null>(currentChatId);

  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);

  const { state: voiceState, transcript, error: voiceError, toggleListening, isSupported } = useVoiceInput();
  const [baseInput, setBaseInput] = useState('');

  const handleToggleVoice = () => {
    if (voiceState === 'idle' || voiceState === 'error') {
      setBaseInput(chatInput);
    }
    toggleListening();
  };

  useEffect(() => {
    if (voiceState === 'listening' && transcript) {
      setChatInput((baseInput ? baseInput + ' ' : '') + transcript);
    }
  }, [transcript, voiceState, baseInput]);

  useEffect(() => {
    if (voiceError) {
      if (voiceError === 'network') {
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
        if (!isSecure) {
          setChatError("Voice input failed. Speech recognition requires a secure HTTPS connection. Please access the application using your ngrok HTTPS tunnel URL.");
        } else {
          setChatError("Speech recognition network error. Please verify your internet connection or browser settings.");
        }
      } else if (voiceError === 'not-allowed') {
        setChatError("Microphone access denied. Please verify your browser's microphone permissions.");
      } else {
        setChatError(`Voice input error: ${voiceError}`);
      }
    }
  }, [voiceError]);

  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [customKeys, setCustomKeys] = useState<CustomKeys>({});
  const [customInstructions, setCustomInstructions] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    try {
      const savedModel = localStorage.getItem('corsair_selected_model');
      if (savedModel) setSelectedModel(savedModel);
      
      const savedKeys = localStorage.getItem('corsair_custom_keys');
      if (savedKeys) {
        const parsed = CustomKeysSchema.safeParse(JSON.parse(savedKeys));
        if (parsed.success) {
          setCustomKeys(parsed.data);
        }
      }

      const savedInstructions = localStorage.getItem('corsair_custom_instructions');
      if (savedInstructions) setCustomInstructions(savedInstructions);
    } catch (e) {
      console.error('Failed to parse settings from local storage', e);
    }
  }, []);

  const handleModelSelect = (val: string) => {
    setSelectedModel(val);
    localStorage.setItem('corsair_selected_model', val);
  };

  const handleKeyChange = (provider: 'google' | 'openai' | 'anthropic', val: string) => {
    const newKeys = { ...customKeys, [provider]: val };
    setCustomKeys(newKeys);
    localStorage.setItem('corsair_custom_keys', JSON.stringify(newKeys));
  };
  
  const { messages, setMessages, sendMessage } = useChat({
    onError: (error: Error) => {
      setChatError(error.message ?? 'Something went wrong. Please try again.');
    },
  });

  const { data: history, isSuccess, isFetching } = api.chat.getChatHistory.useQuery({ chatId: currentChatId || undefined }, {
    enabled: !!session && !!currentChatId,
    refetchOnWindowFocus: false,
  });

  const { mutate: saveChat } = api.chat.saveChatHistory.useMutation();
  const historyLoaded = useRef(false);
  const utils = api.useUtils();

  // Handle URL changes to load different chats
  useEffect(() => {
    if (currentChatId !== activeChatId.current) {
      activeChatId.current = currentChatId;
      historyLoaded.current = false;
      setMessages([]);
      if (!currentChatId) {
        historyLoaded.current = true; // New chat, nothing to load
      }
    }
  }, [currentChatId, setMessages]);

  useEffect(() => {
    if (currentChatId && isSuccess && !isFetching && !historyLoaded.current) {
      historyLoaded.current = true;
      if (history && history.length > 0) {
        setMessages(history as UIMessage[]);
      }
    } else if (!currentChatId) {
      historyLoaded.current = true;
    }
  }, [isSuccess, isFetching, history, currentChatId, setMessages]);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (messages.length > 0 && session?.user?.id && historyLoaded.current) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        let idToSave = activeChatId.current;
        let isNew = false;
        
        if (!idToSave) {
          idToSave = crypto.randomUUID();
          activeChatId.current = idToSave;
          isNew = true;
        }
        
        // Auto-generate a title from the first user message if available
        const firstUserMsg = messages.find(m => m.role === 'user');
        let titleText = 'New Chat';
        if (firstUserMsg && firstUserMsg.parts) {
          const textPart = firstUserMsg.parts.find((p) => p.type === 'text') as { type: 'text', text: string } | undefined;
          if (textPart && typeof textPart.text === 'string' && textPart.text.trim().length > 0) {
            titleText = textPart.text;
          }
        }
        const title = titleText.length > 40 ? titleText.substring(0, 40) + '...' : titleText;

        saveChat({ chatId: idToSave, messages, title }, {
          onSuccess: () => {
            if (isNew) {
              utils.chat.getChats.invalidate();
              router.replace(`/chat?chatId=${idToSave}`);
            }
          }
        });
      }, 1000);
    }
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [messages, session?.user?.id, saveChat, router, utils]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatError]);

  if (isPending) {
    return (
      <div suppressHydrationWarning className="flex-1 flex items-center justify-center bg-white dark:bg-[#0f0e13]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-600" />
      </div>
    );
  }

  if (!session) {
    return null; // app-layout middleware takes care of redirecting
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Center Scrollable Content Area */}
      <ScrollArea className="flex-1 min-h-0 w-full">
        <div className="px-4 sm:px-8 pb-52 pt-6 max-w-4xl w-full mx-auto flex flex-col relative z-10">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
              {/* HeroGreeting */}
              <div className="text-center max-w-2xl w-full mb-12">
                <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
                  <span className="text-gradient">Hello {session.user.name ? session.user.name.split(' ')[0] : 'there'}</span>
                </h1>
                <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-450 dark:text-zinc-500 tracking-tight">
                  How can I help you today?
                </h2>
              </div>

              {/* SuggestionCards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full">
                <div 
                  onClick={() => {
                    setChatInput("Read my last 3 unread emails and summarize them.");
                  }}
                  className="bg-zinc-50/50 dark:bg-zinc-900/10 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-zinc-100/40 dark:hover:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-zinc-400/5 dark:bg-zinc-650/5 blur-[30px] rounded-full pointer-events-none"></div>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mb-4 relative z-10 border border-zinc-200/50 dark:border-zinc-800/50">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-2 relative z-10">Check Inbox</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed relative z-10 font-light">Read and summarize your latest unread emails</p>
                </div>

                <div 
                  onClick={() => {
                    setChatInput("What is my schedule looking like for tomorrow?");
                  }}
                  className="bg-zinc-50/50 dark:bg-zinc-900/10 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-zinc-100/40 dark:hover:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-zinc-400/5 dark:bg-zinc-650/5 blur-[30px] rounded-full pointer-events-none"></div>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mb-4 relative z-10 border border-zinc-200/50 dark:border-zinc-800/50">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-2 relative z-10">Agenda Review</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed relative z-10 font-light">See your upcoming calendar events for tomorrow</p>
                </div>

                <div 
                  onClick={() => {
                    setChatInput("Draft an email to my team about the new project timeline.");
                  }}
                  className="bg-zinc-50/50 dark:bg-zinc-900/10 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:bg-zinc-100/40 dark:hover:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-zinc-400/5 dark:bg-zinc-650/5 blur-[30px] rounded-full pointer-events-none"></div>
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 flex items-center justify-center mb-4 relative z-10 border border-zinc-200/50 dark:border-zinc-800/50">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm mb-2 relative z-10">Draft Communications</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-450 leading-relaxed relative z-10 font-light">Have the AI write a professional email draft for you</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto space-y-6">
              {messages.map((message, index) => {
                const msg = message as UIMessage & { content?: unknown };
                
                // Determine if there is any visible text
                const hasText = msg.parts 
                  ? msg.parts.some(p => p.type === 'text' && typeof p.text === 'string' && p.text.trim())
                  : (typeof msg.content === 'string' && msg.content.trim());
                
                const isAssistantRunningTools = msg.role === 'assistant' && !hasText;

                return (
                  <div key={msg.id || index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] overflow-hidden ${
                      msg.role === 'user' 
                        ? 'bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200/20 shadow-sm rounded-3xl rounded-tr-lg' 
                        : 'bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-800 dark:text-zinc-200 shadow-sm rounded-3xl rounded-tl-lg'
                    } px-5 py-3.5`}>
                      {isAssistantRunningTools ? (
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium py-1 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 dark:text-zinc-500" />
                          <span>Running operations...</span>
                        </div>
                      ) : msg.parts ? (
                        msg.parts.map((part, i) => {
                          switch (part.type) {
                            case 'text':
                              return (
                                <div key={`${msg.id}-${i}`} className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                                  {typeof part.text === 'string' ? part.text : JSON.stringify(part)}
                                </div>
                              );
                            default:
                              return null; // Hide all internal tool-invocation details
                          }
                        })
                      ) : (
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed font-light">
                          {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ChatInputArea */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white dark:from-[#0f0e13] via-white/95 dark:via-[#0f0e13]/95 to-transparent z-30">
        <div className="max-w-3xl w-full mx-auto relative">
          {chatError && (
            <div className="absolute -top-12 left-0 right-0 p-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-full text-zinc-955 dark:text-zinc-100 text-xs flex items-center justify-between shadow-md">
              <span className="pl-2">{chatError}</span>
              <button onClick={() => setChatError(null)} className="text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 font-bold px-2">✕</button>
            </div>
          )}

          {/* settings side panel */}
          <Sheet open={showSettings} onOpenChange={setShowSettings}>
            <SheetContent side="right" className="bg-[#0f0e13]/95 backdrop-blur-md border-l border-zinc-800 text-zinc-100 p-6 sm:max-w-md">
              <SheetHeader>
                <SheetTitle className="text-zinc-100 font-bold">Provider API Keys</SheetTitle>
                <SheetDescription className="text-zinc-400 font-light mt-1">
                  Keys are stored locally in your browser. All models require a valid API key.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Google API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.google || ''}
                    onChange={(e) => handleKeyChange('google', e.target.value)}
                    className="w-full bg-[#09080c] border border-zinc-800 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-zinc-100"
                    placeholder="AIza..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">OpenAI API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.openai || ''}
                    onChange={(e) => handleKeyChange('openai', e.target.value)}
                    className="w-full bg-[#09080c] border border-zinc-800 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-zinc-100"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Anthropic API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.anthropic || ''}
                    onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                    className="w-full bg-[#09080c] border border-zinc-800 rounded-full px-4 py-2.5 text-sm outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 text-zinc-100"
                    placeholder="sk-ant-..."
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 pl-4">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs font-semibold text-zinc-555 dark:text-zinc-400 outline-none cursor-pointer hover:text-zinc-800 dark:hover:text-white transition-colors">
                  <span>{
                    selectedModel === 'google/gemini-2.5-flash' ? 'Gemini 2.5 Flash' :
                    selectedModel === 'openai/gpt-5.4' ? 'GPT-5.4' :
                    selectedModel === 'openai/gpt-5.2' ? 'GPT-5.2' :
                    selectedModel === 'anthropic/claude-opus-4.7' ? 'Claude Opus 4.7' :
                    selectedModel === 'anthropic/claude-sonnet-4.6' ? 'Claude Sonnet 4.6' : selectedModel
                  }</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-405 dark:text-zinc-500" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-850 rounded-2xl p-1.5 shadow-lg w-48">
                  <DropdownMenuItem onClick={() => handleModelSelect("google/gemini-2.5-flash")} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                    Gemini 2.5 Flash
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModelSelect("openai/gpt-5.4")} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                    GPT-5.4
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModelSelect("openai/gpt-5.2")} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                    GPT-5.2
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModelSelect("anthropic/claude-opus-4.7")} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                    Claude Opus 4.7
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleModelSelect("anthropic/claude-sonnet-4.6")} className="cursor-pointer text-xs font-medium rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                    Claude Sonnet 4.6
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setShowSettings(true)}
                    type="button"
                    className="p-1.5 rounded-full transition-colors cursor-pointer text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-650"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Settings & API Keys</p>
                </TooltipContent>
              </Tooltip>
            </div>
            
            <form 
              className="bg-white/75 dark:bg-black/20 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-md rounded-full flex items-center p-1.5 pr-2 transition-shadow focus-within:shadow-lg focus-within:border-zinc-400 dark:focus-within:border-zinc-600"
              onSubmit={e => {
                e.preventDefault();
                if (!session) {
                  setChatError("Please sign in first.");
                  return;
                }
                setChatError(null);
                sendMessage({ text: chatInput }, { body: { model: selectedModel, keys: customKeys, instructions: customInstructions } });
                setChatInput('');
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>

              <input 
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 text-sm outline-none font-light" 
                placeholder={session ? "Ask something about your emails or calendar..." : "Sign in to start chatting..."}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={!session}
              />

              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0 mx-2" />

              {isSupported && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button" 
                      onClick={handleToggleVoice}
                      className={`w-10 h-10 mr-1 flex-shrink-0 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                        voiceState === 'listening' 
                          ? 'text-red-500 bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-900/30 animate-pulse' 
                          : 'text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{voiceState === 'listening' ? 'Stop listening' : 'Start voice input'}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="submit"
                    disabled={!chatInput.trim() || !session}
                    className="w-10 h-10 flex-shrink-0 bg-black dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white dark:text-black disabled:text-zinc-400 dark:disabled:text-zinc-500 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </form>
          </div>
          <div className="text-center mt-3 text-[10px] text-zinc-450 font-light">
            Powered by Corsair MCP and Better Auth.{" "}
            <Link className="text-zinc-850 dark:text-zinc-200 hover:underline font-semibold mx-1" href="/docs">Documentation</Link> ·{" "}
            <Link className="text-zinc-850 dark:text-zinc-200 hover:underline font-semibold mx-1" href="/privacy">Privacy Policy</Link> ·{" "}
            <Link className="text-zinc-850 dark:text-zinc-200 hover:underline font-semibold mx-1" href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
