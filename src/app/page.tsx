"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { useChat, type UIMessage } from '@ai-sdk/react';
import { api } from "@/trpc/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { z } from "zod";

const CustomKeysSchema = z.object({
  google: z.string().optional(),
  openai: z.string().optional(),
  anthropic: z.string().optional(),
  deepseek: z.string().optional(),
});

type CustomKeys = z.infer<typeof CustomKeysSchema>;
export default function Home() {
  const { data: session, isPending } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentChatId = searchParams.get('chatId');
  const activeChatId = useRef<string | null>(currentChatId);

  const [chatInput, setChatInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);

  const { state: voiceState, transcript, toggleListening, isSupported, stopListening } = useVoiceInput();
  const [baseInput, setBaseInput] = useState('');

  const handleToggleVoice = () => {
    if (voiceState === 'idle') {
      setBaseInput(chatInput);
    }
    toggleListening();
  };

  useEffect(() => {
    if (voiceState === 'listening' && transcript) {
      setChatInput((baseInput ? baseInput + ' ' : '') + transcript);
    }
  }, [transcript, voiceState, baseInput]);

  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash');
  const [customKeys, setCustomKeys] = useState<CustomKeys>({});
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
    } catch (e) {
      console.error('Failed to parse settings from local storage', e);
    }
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModel(val);
    localStorage.setItem('corsair_selected_model', val);
  };

  const handleKeyChange = (provider: 'google' | 'openai' | 'anthropic' | 'deepseek', val: string) => {
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
              router.replace(`/?chatId=${idToSave}`);
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

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Center Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-32 flex flex-col relative z-10 custom-scrollbar">
        
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* HeroGreeting */}
            <div className="text-center max-w-2xl w-full mb-12 transform -translate-y-8">
              <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">
                <span className="text-gradient">Hello {session?.user?.name ? session.user.name.split(' ')[0] : 'there'}</span>
              </h1>
              <h2 className="text-3xl sm:text-4xl font-semibold text-gray-400 tracking-tight">
                How can I help you today?
              </h2>
            </div>

            {/* SuggestionCards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl transform -translate-y-4">
              <div 
                onClick={() => {
                  setChatInput("Read my last 3 unread emails and summarize them.");
                }}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:bg-gray-100 transition-all cursor-pointer hover:-translate-y-1"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-purple-400/10 blur-[40px] rounded-full pointer-events-none"></div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 flex items-center justify-center mb-4 relative z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2 relative z-10">Check Inbox</h3>
                <p className="text-xs text-gray-400 leading-relaxed relative z-10">Read and summarize your latest unread emails</p>
              </div>

              <div 
                onClick={() => {
                  setChatInput("What is my schedule looking like for tomorrow?");
                }}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:bg-gray-100 transition-all cursor-pointer hover:-translate-y-1"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-pink-400/10 blur-[40px] rounded-full pointer-events-none"></div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600 flex items-center justify-center mb-4 relative z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2 relative z-10">Agenda Review</h3>
                <p className="text-xs text-gray-400 leading-relaxed relative z-10">See your upcoming calendar events for tomorrow</p>
              </div>

              <div 
                onClick={() => {
                  setChatInput("Draft an email to my team about the new project timeline.");
                }}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:bg-gray-100 transition-all cursor-pointer hover:-translate-y-1"
              >
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-24 bg-indigo-400/10 blur-[40px] rounded-full pointer-events-none"></div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 flex items-center justify-center mb-4 relative z-10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2 relative z-10">Draft Communications</h3>
                <p className="text-xs text-gray-400 leading-relaxed relative z-10">Have the AI write a professional email draft for you</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 max-w-3xl w-full mx-auto space-y-6 pt-4">
            {messages.map((message, index) => {
              const msg = message as UIMessage & { content?: unknown };
              return (
                <div key={msg.id || index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] overflow-hidden rounded-2xl px-5 py-3 ${msg.role === 'user' ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-50 border border-gray-200 text-gray-800 shadow-sm'}`}>
                    {msg.parts ? msg.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return <div key={`${msg.id}-${i}`} className="whitespace-pre-wrap break-words text-sm leading-relaxed">{typeof part.text === 'string' ? part.text : JSON.stringify(part)}</div>;
                        default:
                          return (
                            <pre key={`${msg.id}-${i}`} className="text-[10px] mt-2 bg-black/5 p-2 rounded overflow-x-auto text-left text-gray-500 font-mono">
                              {JSON.stringify(part, null, 2)}
                            </pre>
                          );
                      }
                    }) : (
                      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
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

      {/* ChatInputArea */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
        <div className="max-w-3xl w-full mx-auto relative">
          {chatError && (
            <div className="absolute -top-12 left-0 right-0 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-center justify-between shadow-sm">
              <span>{chatError}</span>
              <button onClick={() => setChatError(null)} className="text-red-400 hover:text-red-600 font-bold px-2">✕</button>
            </div>
          )}
          {showSettings && (
            <div className="absolute bottom-20 left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-2xl p-4 z-40 transform transition-all">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 text-sm">Provider API Keys (Optional)</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Keys are stored locally in your browser. All models require a valid API key.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Google API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.google || ''}
                    onChange={(e) => handleKeyChange('google', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="AIza..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">OpenAI API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.openai || ''}
                    onChange={(e) => handleKeyChange('openai', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Anthropic API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.anthropic || ''}
                    onChange={(e) => handleKeyChange('anthropic', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="sk-ant-..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">DeepSeek API Key</label>
                  <input 
                    type="password" 
                    value={customKeys.deepseek || ''}
                    onChange={(e) => handleKeyChange('deepseek', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-400"
                    placeholder="sk-..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pl-4">
              <select 
                value={selectedModel}
                onChange={handleModelChange}
                className="bg-transparent text-xs font-medium text-gray-500 outline-none cursor-pointer hover:text-gray-800 transition-colors"
              >
                <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="openai/gpt-5.4">GPT-5.4</option>
                <option value="openai/gpt-5.2">GPT-5.2</option>
                <option value="anthropic/claude-opus-4.7">Claude Opus 4.7</option>
                <option value="anthropic/claude-sonnet-4.6">Claude Sonnet 4.6</option>
                <option value="deepseek/deepseek-v3.2">DeepSeek V3.2</option>
              </select>
              
              <button 
                onClick={() => setShowSettings(!showSettings)}
                type="button"
                className={`p-1 rounded-md transition-colors ${showSettings ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                title="API Key Settings"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </button>
            </div>
            
            <form 
              className="bg-white border border-gray-200 shadow-lg rounded-full flex items-center p-2 pr-3 transition-shadow focus-within:shadow-xl"
            onSubmit={e => {
              e.preventDefault();
              if (!session) {
                setChatError("Please sign in first.");
                return;
              }
              setChatError(null);
              sendMessage({ text: chatInput }, { body: { model: selectedModel, keys: customKeys } });
              setChatInput('');
            }}
          >
            <button type="button" className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </button>
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-gray-700 placeholder-gray-400 text-sm outline-none" 
              placeholder={session ? "Ask something about your emails or calendar..." : "Sign in to start chatting..."}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={!session}
            />
            {isSupported && (
              <button 
                type="button" 
                onClick={handleToggleVoice}
                className={`w-10 h-10 mr-1 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${
                  voiceState === 'listening' 
                    ? 'text-red-500 bg-red-50 animate-pulse' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title={voiceState === 'listening' ? 'Stop listening' : 'Start voice input'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
              </button>
            )}
            <button 
              type="submit"
              disabled={!chatInput.trim() || !session}
              className="w-10 h-10 flex-shrink-0 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-105 active:scale-95"
            >
              <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>
          </form>
          </div>
          <div className="text-center mt-3 text-[10px] text-gray-400">
            Powered by Corsair MCP and Better Auth. <a className="text-purple-500 hover:underline font-medium" href="#">Documentation</a>
          </div>
        </div>
      </div>
    </div>
  );
}
