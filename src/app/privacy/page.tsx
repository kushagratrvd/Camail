"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 sm:p-10 shadow-sm relative">
        {/* Banner */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-600 dark:bg-purple-500"></div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Last Updated: June 17, 2026
          </p>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-2xl">
          <h2 className="font-bold text-xs text-purple-800 dark:text-purple-300 uppercase tracking-wider mb-1">
            Google API Limited Use Disclosure
          </h2>
          <p className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
            Camail's use and transfer to any other app of information received from Google APIs will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. Your data is not stored permanently except for local syncing caches, nor is it ever sold or shared with advertising platforms.
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">1. Information We Collect</h3>
            <p>
              We request access to specific Google scopes to enable AI-powered integrations:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
              <li>
                <strong>Gmail (gmail.modify):</strong> Used to search, read, draft, and reply to messages based on your explicit AI prompt requests.
              </li>
              <li>
                <strong>Calendar (calendar):</strong> Used to display weekly views and schedule meetings, create event drafts, and send invites.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">2. How We Use Your Data</h3>
            <p>
              Your emails and calendars are parsed locally to compile AI replies and summaries. We do not use user data to train proprietary or third-party AI models. Local storage handles key storage, and secure server tokens connect with Google Workspace API clients.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">3. Data Protection</h3>
            <p>
              All stored credentials and OAuth tokens are protected via Data Encryption Keys (DEKs). Any traffic is served exclusively via SSL/TLS secure communication protocols.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">4. Your Control</h3>
            <p>
              You can revoke permission at any time directly through your Google Account Security Dashboard. For full profile erasure, contact customer support or visit your account portal.
            </p>
          </section>
        </div>

        <hr className="border-gray-100 dark:border-gray-900" />

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>© {new Date().getFullYear()} Camail. All rights reserved.</span>
          <Link href="/terms" className="text-purple-500 dark:text-purple-400 hover:underline">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
