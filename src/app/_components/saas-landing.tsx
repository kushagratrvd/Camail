"use client";

import { useState, useEffect, useRef } from "react";
import { signIn, useSession } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Calendar, 
  ArrowRight, 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  Mic,
  PenTool,
  CheckCircle2
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function SaaSLanding() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { data: session } = useSession();
  const router = useRouter();

  const handleGetStarted = () => {
    if (session) {
      void router.push("/chat");
    } else {
      void signIn.social({ provider: "google", callbackURL: "/chat" });
    }
  };

  const faqItems = [
    {
      question: "Is my data secure with Google OAuth?",
      answer: "Yes, absolutely. Camail connects to your Google account using secure OAuth 2.0. We never see your password, and you can revoke access at any time directly through your Google Account settings."
    },
    {
      question: "Can I run this using my own API keys?",
      answer: "Yes, you can! Camail allows you to optionally provide your own Google, OpenAI, or Anthropic API keys in the settings panel to run queries directly through your personal accounts."
    },
    {
      question: "Does voice input support speech-to-text in real time?",
      answer: "Yes. Camail integrates Web Speech API to provide fast, secure, and client-side speech recognition. It transcribes your voice input directly into the chat prompt."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f0e13] text-zinc-100 flex flex-col font-sans select-none overflow-y-auto scroll-smooth">
      {/* Landing Header */}
      <header className="landing-header sticky top-0 z-50 w-full border-b border-white/10 bg-[#0f0e13]/85 backdrop-blur-md">
   <div className="nav-bar h-15 mx-auto max-w-7xl px-6 sm:px-12 flex items-center justify-between">
     {/* Logo */}
     <div className="flex items-center gap-3">
       <span className="font-bold text-lg tracking-tight text-white">
         Camail
       </span>
     </div>

        {/* Nav links */}
        <nav className="nav-links hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        {/* Actions */}
          <button
            onClick={handleGetStarted}
            className="bg-white text-[#0f0e13] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-zinc-200 transition-all cursor-pointer shadow-sm"
          >
            Get Started
          </button>
      </div>
    </header>

      {/* Hero Section */}
      <section className="relative px-6 sm:px-12 pt-20 pb-16 text-center max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
          Your inbox and calendar,<br />managed by AI.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 mb-8 max-w-2xl font-light">
          Read, summarize, draft, and coordinate meetings in seconds. Pure text, natural voice, and zero friction.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button 
            onClick={handleGetStarted}
            className="bg-white text-[#0f0e13] font-semibold px-8 py-3.5 rounded-full hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            Connect Google Account <ArrowRight className="w-4 h-4" />
          </button>
          <a 
            href="#how-it-works"
            className="border border-white/20 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Learn How it Works
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-2 shadow-2xl relative">
          <div className="rounded-xl border border-white/5 bg-[#09080c] overflow-hidden aspect-[16/10] flex flex-col">
            {/* Mock Header */}
            <div className="h-12 border-b border-white/10 px-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
              </div>
              <div className="text-xs text-zinc-500 font-medium">demo.camail.ai</div>
              <div className="w-4 h-4 rounded-full bg-zinc-800"></div>
            </div>
            {/* Mock Dashboard Grid */}
            <div className="flex-1 flex overflow-hidden">
              {/* Mock Sidebar */}
              <div className="w-1/4 border-r border-white/5 bg-[#09080c]/50 p-3 hidden sm:flex flex-col gap-4">
                <div className="h-6 w-24 bg-zinc-800 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-zinc-900 rounded-full w-full"></div>
                  <div className="h-5 bg-zinc-900 rounded-full w-4/5"></div>
                  <div className="h-5 bg-zinc-900 rounded-full w-3/4"></div>
                </div>
              </div>
              {/* Mock Main Pane */}
              <div className="flex-1 p-6 flex flex-col justify-between">
                <div className="space-y-4 max-w-md">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800"></div>
                    <div className="h-8 bg-zinc-900 rounded-2xl w-48"></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <div className="h-16 bg-white/10 backdrop-blur-sm border border-white/5 rounded-2xl w-64 p-3 text-[10px] text-left text-zinc-300">
                      Summarize my last 3 unread emails and draft a reply to Marcus.
                    </div>
                    <div className="w-6 h-6 rounded-full bg-white"></div>
                  </div>
                </div>
                {/* Mock Input Bar */}
                <div className="w-full max-w-xl mx-auto h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-between px-4">
                  <div className="h-4 bg-zinc-800 rounded-full w-32"></div>
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="px-6 sm:px-12 py-24 bg-black/40 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-center mb-16">
            Designed to integrate seamlessly.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0f0e13] font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-lg text-white">Link Google Account</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Connect your account securely via OAuth. We scan your mail inbox and calendar endpoints client-side.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0f0e13] font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-lg text-white">Instruct the AI</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Prompt your assistant with natural keyboard inputs or real-time voice speech in our clean console.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#0f0e13] font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-lg text-white">Automate Workflows</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Your AI immediately processes actions: drafts mail responses, creates events, or checks schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="px-6 sm:px-12 py-20 border-t border-white/5 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-8">
            Officially Integrated Services
          </h2>
          <div className="flex gap-6 flex-wrap justify-center">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-zinc-300" />
              <span className="text-sm font-semibold text-white">Gmail</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 flex items-center gap-3">
              <Calendar className="w-4 h-4 text-zinc-305" />
              <span className="text-sm font-semibold text-white">Google Calendar</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section id="security" className="px-6 sm:px-12 py-24 bg-black/40 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Your security is our baseline.
            </h2>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto font-light">
              We know accessing your inbox is sensitive. That's why Camail is engineered from the ground up to respect data limits.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-white">OAuth Secure</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Connect safely without sharing raw credentials. Revoke account permissions inside your Google dashboard anytime.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-white">Privacy-First</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Your email contents are read client-side and never saved on our servers or used to train public LLM models.
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-white">Zero Retention</h3>
              <p className="text-zinc-400 text-sm leading-relaxed font-light">
                Emails retrieved during a chat session are held ephemerally and cleared immediately upon closing the window.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 sm:px-12 py-24 bg-black/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-400 text-sm max-w-md mx-auto font-light">
              Choose the perfect plan to streamline your productivity and automate your daily tasks.
            </p>

            {/* Toggle Billing */}
            <div className="mt-8 flex justify-center items-center gap-3">
              <span className={`text-sm font-semibold ${billingCycle === "monthly" ? "text-white" : "text-zinc-500"}`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className="w-12 h-6 bg-white/10 rounded-full p-1 flex items-center transition-all cursor-pointer border border-white/10"
                aria-label="Toggle billing cycle"
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform transform ${
                    billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
              <span className={`text-sm font-semibold flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-white" : "text-zinc-500"}`}>
                Yearly
                <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 uppercase tracking-wider">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Starter Plan */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 flex flex-col transition-all hover:border-white/20">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed h-10 font-light">
                  Essential tools for basic email summaries and scheduling.
                </p>
              </div>

              <div className="flex items-baseline mb-6 border-b border-white/10 pb-6">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-sm text-zinc-400 ml-1">/ month</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "100 AI queries per month",
                  "Summarize last 3 unread emails",
                  "View upcoming schedule",
                  "Standard support responses",
                ].map((feature) => (
                  <li key={feature} className="flex items-start text-sm text-zinc-300 font-light">
                    <CheckCircle2 className="w-4 h-4 text-white mt-0.5 mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full py-3 px-4 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer text-center"
              >
                Get Started for Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-white/5 backdrop-blur-md border border-white rounded-3xl p-8 flex flex-col transition-all relative shadow-2xl shadow-white/5">
              <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-white text-[#0f0e13] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                Most Popular
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold text-white">Pro</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed h-10 font-light">
                  Advanced AI assistance and fully automated workflows.
                </p>
              </div>

              <div className="flex items-baseline mb-6 border-b border-white/10 pb-6">
                <span className="text-4xl font-extrabold text-white">
                  ${billingCycle === "monthly" ? "15" : "12"}
                </span>
                <span className="text-sm text-zinc-400 ml-1">/ month</span>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Unlimited AI assistant queries",
                  "Full Gmail write/read synchronization",
                  "Google Calendar auto-scheduling",
                  "Smarter multi-turn agent memory",
                  "Draft complex communications",
                  "Priority email support",
                ].map((feature) => (
                  <li key={feature} className="flex items-start text-sm text-zinc-300 font-light">
                    <CheckCircle2 className="w-4 h-4 text-white mt-0.5 mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={handleGetStarted}
                className="w-full py-3 px-4 rounded-full text-sm font-semibold bg-white hover:bg-zinc-200 text-[#0f0e13] transition-all cursor-pointer text-center"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="px-6 sm:px-12 py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white text-center mb-16">
            Frequently Asked Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-4 w-full">
            {faqItems.map((item, index) => (
              <AccordionItem 
                value={`item-${index}`} 
                key={index} 
                className="border border-white/10 rounded-2xl overflow-hidden transition-all bg-white/5 backdrop-blur-sm"
              >
                <AccordionTrigger className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-white focus:outline-none cursor-pointer hover:no-underline">
                  <span>{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="border-t border-white/5">
                  <p className="px-6 py-5 text-sm text-zinc-400 leading-relaxed bg-[#0a090d]/40">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="px-6 sm:px-12 py-20 border-t border-white/5 bg-black/40">
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-16 text-center flex flex-col items-center gap-6 relative overflow-hidden">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none"></div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to supercharge your workflow?
          </h2>
          <p className="text-zinc-400 text-sm max-w-md font-light">
            Connect your Gmail and Calendar for free and let AI simplify your scheduling, summarization, and email drafting.
          </p>
          <button
            onClick={handleGetStarted}
            className="bg-white text-[#0f0e13] font-bold px-8 py-4 rounded-full hover:bg-zinc-200 transition-all shadow-lg cursor-pointer"
          >
            Connect Gmail and Calendar
          </button>
          </div>
      </section>

      {/* Camail Branding Section */}
      <section className="relative w-full py-24 md:py-32 flex items-center justify-center overflow-hidden bg-[#0a0a0c]">
      {/* Ambient background glow behind the text */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />
      
      <h2 
        className="relative text-[13vw] font-black tracking-[-0.03em] md:tracking-[-0.04em] leading-none select-none uppercase font-sans text-transparent bg-clip-text bg-gradient-to-b from-white/[0.05] to-white/[0.01]"
        style={{
          WebkitTextStroke: '1px rgba(255, 255, 255, 0.02)',
        }}
      >
        Camail
      </h2>
    </section>

      {/* Footer */}
      <footer className="h-20 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 bg-[#09080c] text-xs text-zinc-500 mt-auto">
        <div>
          &copy; {new Date().getFullYear()} Camail. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link className="hover:text-zinc-300 transition-colors" href="/terms">Terms of Service</Link>
          <Link className="hover:text-zinc-300 transition-colors" href="/privacy">Privacy Policy</Link>
          <Link className="hover:text-zinc-300 transition-colors" href="/docs">Documentation</Link>
        </div>
      </footer>
    </div>
  );
}
