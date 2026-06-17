"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 custom-scrollbar">
      <div className="max-w-3xl mx-auto space-y-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-3xl p-6 sm:p-10 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Last Updated: June 17, 2026
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">1. Platform License</h3>
            <p>
              Camail grants you a personal, non-transferable, non-exclusive license to use the productivity platform for your workspace and personal emails.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">2. Acceptable Use</h3>
            <p>
              You agree to use the service in compliance with all relevant regulations. You must not attempt to manipulate, disrupt, or exploit the AI pipelines or workspace sync databases.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">3. Disclaimer of Warranty</h3>
            <p className="italic">
              Camail is provided "as is" and "as available". We do not guarantee that the AI operations will always be accurate, error-free, or complete.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-base">4. Limitation of Liability</h3>
            <p>
              To the maximum extent permitted by law, Camail is not liable for direct, indirect, incidental, or punitive damages resulting from your use of the application.
            </p>
          </section>
        </div>

        <hr className="border-gray-100 dark:border-gray-900" />

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>© {new Date().getFullYear()} Camail. All rights reserved.</span>
          <Link href="/privacy" className="text-purple-500 dark:text-purple-400 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
