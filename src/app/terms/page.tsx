"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar bg-white dark:bg-[#0f0e13]">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-900 rounded-3xl p-6 sm:p-10 shadow-sm relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900 dark:bg-zinc-100"></div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1 font-light">
            Last Updated: June 17, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed animate-fade-in">
          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">1. Platform License</h3>
            <p className="font-light">
              Camail grants you a personal, non-transferable, non-exclusive license to use the productivity platform for your workspace and personal emails.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">2. Acceptable Use</h3>
            <p className="font-light">
              You agree to use the service in compliance with all relevant regulations. You must not attempt to manipulate, disrupt, or exploit the AI pipelines or workspace sync databases.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">3. Disclaimer of Warranty</h3>
            <p className="italic font-light">
              Camail is provided "as is" and "as available". We do not guarantee that the AI operations will always be accurate, error-free, or complete.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 text-base">4. Limitation of Liability</h3>
            <p className="font-light">
              To the maximum extent permitted by law, Camail is not liable for direct, indirect, incidental, or punitive damages resulting from your use of the application.
            </p>
          </section>
        </div>

        <hr className="border-zinc-100 dark:border-zinc-900" />

        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <span>© {new Date().getFullYear()} Camail. All rights reserved.</span>
          <Link href="/privacy" className="text-zinc-800 dark:text-zinc-200 hover:underline font-semibold">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
