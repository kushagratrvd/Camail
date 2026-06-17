"use client";

import { useEffect, useRef } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();

  const hasSynced = useRef(false);

  useEffect(() => {
    if (session?.user?.id && !hasSynced.current) {
      hasSynced.current = true;
      fetch("/api/auth/sync", { method: "POST" }).catch(console.error);
    }
  }, [session?.user?.id]);

  const navItems = [
    {
      name: "Chat",
      href: "/",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      )
    },
    {
      name: "Activity",
      href: "/activity",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
      )
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: (
        <svg className="w-5 h-5 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 8.25h19M2.5 12h19m-16.5 5.25h6m-6 2.25h3m-5.625-10.125a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3v-12Z" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full h-full max-w-[1440px] bg-white rounded-3xl shadow-2xl border border-gray-200/80 flex overflow-hidden relative">
      {/* Sidebar */}
      <aside className="w-[280px] h-full bg-gray-50 border-r border-gray-200 flex flex-col pt-6 pb-4 px-4 z-10 relative hidden md:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 mb-8 cursor-pointer">
          <Link href="/" className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"></path>
            </svg>
          </Link>
          <Link href="/" className="font-bold text-lg text-gray-800 tracking-tight">
            Camail
          </Link>
        </div>
        
        {/* Search Box */}
        <div className="px-2 mb-6">
          <div className="relative flex items-center w-full h-10 rounded-xl bg-white border border-gray-200 focus-within:ring-2 focus-within:ring-purple-150 focus-within:border-purple-300 transition-all">
            <svg className="w-4 h-4 text-gray-400 absolute left-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <input className="w-full h-full bg-transparent border-none focus:ring-0 text-sm pl-9 pr-3 text-gray-800 placeholder-gray-400 rounded-xl outline-none" placeholder="Search chat" type="text"/>
          </div>
        </div>
        
        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-8">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link 
                    href={item.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm group ${
                      isActive 
                        ? "bg-purple-50 text-purple-700 border border-purple-100 shadow-sm" 
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className={isActive ? "text-purple-600" : "text-gray-400 group-hover:text-purple-500"}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Upgrade Card */}
        <div className="mt-auto pt-4 px-2">
          <Link href="/pricing" className="block bg-gradient-to-br from-[#fdfbfb] to-[#ebedee] border border-gray-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <span className="text-sm font-bold text-gray-800">Upgrade to</span>
              <span className="text-[10px] font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 rounded-full uppercase tracking-wider">Pro</span>
            </div>
            <p className="text-xs text-gray-500 relative z-10 leading-relaxed">
              Upgrade for image uploads, smarter AI, and more Pro Search.
            </p>
          </Link>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col h-full relative z-0 overflow-hidden bg-white">
        {/* Top Bar Header */}
        <header className="h-20 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 relative z-20 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            {/* Small screen mobile logo */}
            <div className="md:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            </div>
            <button className="font-bold text-xl tracking-tight text-gray-800">
              Camail
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {isPending ? (
              <span className="text-sm text-gray-400">Loading...</span>
            ) : session ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => signOut()} 
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Sign Out
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-semibold text-gray-800">{session.user.name}</div>
                    <div className="text-xs text-gray-400">{session.user.email}</div>
                  </div>
                  {session.user.image ? (
                    <img alt="User Avatar" className="w-10 h-10 rounded-full border border-gray-100 shadow-sm object-cover" src={session.user.image} />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-gray-100 shadow-sm bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                      {session.user.name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => signIn.social({ provider: "google" })}
                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-800 shadow-sm transition-all"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </header>

        {/* Page children viewport */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
          {children}
        </div>
      </main>
    </div>
  );
}
