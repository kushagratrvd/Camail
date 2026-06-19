"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { 
  Home, 
  Inbox, 
  Calendar, 
  Activity, 
  Tag, 
  Settings, 
  BookOpen, 
  Search, 
  PanelLeft, 
  Sun, 
  Moon, 
  MessageSquare,
  MoreVertical,
  Loader2
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentChatId = searchParams.get('chatId');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const utils = api.useUtils();
  const deleteChatMutation = api.chat.deleteChat.useMutation({
    onSuccess: () => {
      void utils.chat.getChats.invalidate();
      if (currentChatId) {
        void router.push('/chat');
      }
    }
  });

  // Handle closing menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenuChatId(null);
    };
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("click", handleClickOutside);
    };
  }, [currentChatId, router, utils]);

  const { data: chats } = api.chat.getChats.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  const hasSynced = useRef(false);

  useEffect(() => {
    if (session?.user?.id && !hasSynced.current) {
      hasSynced.current = true;
      fetch("/api/auth/sync", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          if (data && (data.success || !data.error)) {
            void utils.gmail.searchEmails.invalidate();
            void utils.calendar.searchEvents.invalidate();
          }
        })
        .catch(console.error);
    }
  }, [session?.user?.id, utils]);

  useEffect(() => {
    if (!isPending && !session && pathname !== "/") {
      void router.replace("/");
    }
  }, [session, isPending, pathname, router]);

  const isLandingPage = pathname === "/";

  if (isLandingPage) {
    return <div className="w-screen min-h-screen bg-[#0f0e13]">{children}</div>;
  }

  // Guard: don't render theme-dependent UI until client has resolved dark mode or session is validated
  if (!session || isDarkMode === null) {
    return (
      <div className="w-screen h-screen bg-white dark:bg-[#0f0e13] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400 dark:text-zinc-600" />
      </div>
    );
  }

  const navItems = [
    {
      name: "Home",
      href: "/chat",
      icon: <Home className="w-5 h-5 transition-colors" />
    },
    {
      name: "Inbox",
      href: "/inbox",
      icon: <Inbox className="w-5 h-5 transition-colors" />
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: <Calendar className="w-5 h-5 transition-colors" />
    },
    {
      name: "Activity",
      href: "/activity",
      icon: <Activity className="w-5 h-5 transition-colors" />
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: <Tag className="w-5 h-5 transition-colors" />
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="w-5 h-5 transition-colors" />
    },
    {
      name: "Docs",
      href: "/docs",
      icon: <BookOpen className="w-5 h-5 transition-colors" />
    }
  ];

  return (
    <div className="w-screen h-screen bg-white dark:bg-[#0f0e13] flex overflow-hidden relative transition-colors duration-200">
      {/* Sidebar */}
      {session && (
        <aside className={`h-full bg-zinc-50/70 dark:bg-[#09080c]/60 backdrop-blur-md border-r border-zinc-200/80 dark:border-zinc-800/80 flex-col pt-6 pb-4 z-10 relative transition-all duration-300 ${
          isSidebarOpen 
            ? 'w-[280px] px-4 flex' 
            : 'w-0 hidden md:w-[80px] md:px-2 md:flex'
        } overflow-hidden`}>
          {/* Logo & Theme Toggle */}
          <div className={`flex items-center justify-between gap-3 px-2 mb-6 whitespace-nowrap ${!isSidebarOpen ? 'justify-center' : ''}`}>
            <div className="flex items-center gap-3 cursor-pointer">
              <Link href="/chat" className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center font-bold text-white dark:text-zinc-900 text-sm">
                C
              </Link>
              {isSidebarOpen && (
                <Link href="/chat" className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Camail
                </Link>
              )}
            </div>
            
            {isSidebarOpen && (
              <button
                onClick={toggleDarkMode}
                className="relative w-12 h-6 bg-zinc-200 dark:bg-zinc-850 rounded-full p-1 transition-colors duration-300 flex items-center cursor-pointer border border-zinc-250 dark:border-zinc-800"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <div
                  className={`w-4 h-4 bg-white dark:bg-zinc-950 rounded-full shadow-sm flex items-center justify-center transition-all duration-300 transform ${
                    isDarkMode ? "translate-x-6" : "translate-x-0"
                  }`}
                >
                  {isDarkMode ? (
                    <Sun className="w-3 h-3 text-zinc-400" />
                  ) : (
                    <Moon className="w-3 h-3 text-zinc-600" />
                  )}
                </div>
              </button>
            )}
          </div>
          
          {/* Search Box */}
          {isSidebarOpen && (
            <div className="px-2 mb-6 whitespace-nowrap">
              <div className="relative flex items-center w-full h-10 rounded-full bg-white/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-650 transition-all">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5" />
                <input className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-10 pr-4 text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 rounded-full outline-none" placeholder="Search chat" type="text"/>
              </div>
            </div>
          )}
          
          {/* Main Navigation */}
          <nav className={`flex-1 overflow-y-auto custom-scrollbar px-2 space-y-8 ${isSidebarOpen ? 'min-w-[240px]' : 'w-full'}`}>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href && (!currentChatId || item.name !== 'Home');
                
                const linkEl = (
                  <Link 
                    href={item.href} 
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-full transition-all font-medium text-sm group ${
                      isActive 
                        ? "bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/30 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                    } ${!isSidebarOpen ? "justify-center" : ""}`}
                  >
                    <span className={isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"}>
                      {item.icon}
                    </span>
                    {isSidebarOpen && (
                      <span className={isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                );

                return (
                  <li key={item.name}>
                    {!isSidebarOpen ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      linkEl
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Chat History Section */}
            <div className="pt-2">
              {isSidebarOpen ? (
                <div className="flex items-center justify-between px-3 mb-2">
                  <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Recent Chats</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => router.push('/chat')}
                        className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>New Chat</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
              )}
              <ul className="space-y-1">
                {(chats as { id: string; title: string }[])?.map((chat) => (
                  <li key={chat.id} className="relative group/item flex items-center w-full">
                    <Link 
                      href={`/chat?chatId=${chat.id}`}
                      className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all font-medium text-sm group flex-1 min-w-0 ${
                        currentChatId === chat.id
                          ? "bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm" 
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/30 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
                      } ${!isSidebarOpen ? "justify-center" : ""}`}
                      title={!isSidebarOpen ? chat.title : undefined}
                    >
                      <span className={currentChatId === chat.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200"}>
                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      </span>
                      {isSidebarOpen && (
                        <span className={`truncate flex-1 pr-6 transition-colors ${
                          currentChatId === chat.id 
                            ? "text-zinc-900 dark:text-zinc-100" 
                            : "text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white"
                        }`}>
                          {chat.title}
                        </span>
                      )}
                    </Link>
                    
                    {isSidebarOpen && (
                      <div className="absolute right-2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenMenuChatId(openMenuChatId === chat.id ? null : chat.id);
                          }}
                          className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-850 rounded-md transition-colors cursor-pointer"
                          title="Chat Actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        
                        {openMenuChatId === chat.id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-xl py-1 z-30">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                deleteChatMutation.mutate({ chatId: chat.id });
                                setOpenMenuChatId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-405 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                            >
                              Delete Chat
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {chats?.length === 0 && isSidebarOpen && (
                  <div className="px-3 py-2 text-xs text-zinc-450 italic">No recent chats</div>
                )}
              </ul>
            </div>
          </nav>
          
          {/* Upgrade Card or Slim Theme Toggle */}
          {isSidebarOpen ? (
            <div className="mt-auto pt-4 px-2 whitespace-nowrap min-w-[240px]">
              <Link href="/pricing" className="block bg-zinc-100/30 dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Upgrade to</span>
                  <span className="text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 relative z-10 leading-relaxed whitespace-normal font-light">
                  Upgrade for unlimited AI queries, full write sync, and automated calendar scheduling.
                </p>
              </Link>
            </div>
          ) : (
            <div className="mt-auto pt-4 flex justify-center w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDarkMode}
                    className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center justify-center transition-all shadow-sm cursor-pointer relative overflow-hidden group"
                  >
                    <div className="relative w-5 h-5 flex items-center justify-center transition-transform duration-500 transform group-hover:scale-110">
                      {isDarkMode ? (
                        <Sun className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <Moon className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </aside>
      )}

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-h-0 relative z-0 overflow-hidden bg-white dark:bg-[#0f0e13]">
        {/* Top Bar Header */}
        {session && (
          <header className="h-15 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 relative z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0e13]">
            <div className="flex items-center gap-3">
              {/* Sidebar Toggle Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 hover:bg-zinc-50 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                  >
                    <PanelLeft className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}</p>
                </TooltipContent>
              </Tooltip>
              <button className="font-bold text-xl tracking-tight text-zinc-800 dark:text-zinc-100 md:hidden">
                Camail
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              {isPending ? (
                <span className="text-sm text-zinc-450">Loading...</span>
              ) : session ? (
                <div className="flex items-center gap-4">
                  <div className="text-left hidden sm:block">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {session.user.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-none">
                      {session.user.email}
                    </div>
                  </div>
                  {session.user.image ? (
                    <img 
                      alt="User Avatar" 
                      className="w-10 h-10 rounded-full border border-zinc-250 dark:border-zinc-800/80 shadow-sm object-cover" 
                      src={session.user.image} 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-zinc-250 dark:border-zinc-800/80 shadow-sm bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 text-sm">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <button 
                    onClick={() => signOut()} 
                    className="border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => signIn.social({ provider: "google" })}
                  className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium px-4 py-2 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm transition-all cursor-pointer"
                >
                  Sign In with Google
                </button>
              )}
            </div>
          </header>
        )}

        {/* Page children viewport */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white dark:bg-[#0f0e13]">
          {children}
        </div>
      </main>
    </div>
  );
}
