"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar bg-white dark:bg-[#0f0e13]">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 sm:p-10 shadow-sm relative">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1 font-light">
            Last Updated: June 17, 2026
          </p>
        </div>

        <div className="p-5 bg-zinc-50/50 dark:bg-black/20 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex gap-3 items-start">
          <ShieldCheck className="w-5 h-5 text-zinc-650 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-xs text-zinc-800 dark:text-zinc-200 uppercase tracking-wider mb-1">
              Google API Limited Use Disclosure
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-light">
              Camail's use and transfer to any other app of information received from Google APIs will adhere to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. Your data is not stored permanently except for local syncing caches, nor is it ever sold or shared with advertising platforms.
            </p>
          </div>
        </div>

        <div className="space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">1. Information We Collect</h3>
            <p className="font-light">
              We request access to specific Google scopes to enable AI-powered integrations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-light">
              <li>
                <strong>Gmail (gmail.modify):</strong> Used to search, read, draft, and reply to messages based on your explicit AI prompt requests.
              </li>
              <li>
                <strong>Calendar (calendar):</strong> Used to display weekly views and schedule meetings, create event drafts, and send invites.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">2. How We Use Your Data</h3>
            <p className="font-light">
              Your emails and calendars are parsed locally to compile AI replies and summaries. We do not use user data to train proprietary or third-party AI models. Local storage handles key storage, and secure server tokens connect with Google Workspace API clients.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">3. Data Protection</h3>
            <p className="font-light">
              All stored credentials and OAuth tokens are protected via Data Encryption Keys (DEKs). Any traffic is served exclusively via SSL/TLS secure communication protocols.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">4. Your Control</h3>
            <p className="font-light">
              You can revoke permission at any time directly through your Google Account Security Dashboard. For full profile erasure, contact customer support or visit your account portal.
            </p>
          </section>
        </div>

        <hr className="border-zinc-100 dark:border-zinc-900" />

        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} Camail. All rights reserved.</span>
          <Link href="/terms" className="text-zinc-800 dark:text-zinc-200 hover:underline font-semibold">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
