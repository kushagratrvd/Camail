"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";

export default function PricingPage() {
  const { data: session } = useSession();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  const handleUpgrade = (planName: string) => {
    setSelectedPlan(planName);
    setShowModal(true);
  };

  const plans = [
    {
      name: "Starter",
      price: "0",
      description: "Essential tools for basic email summaries and scheduling.",
      features: [
        "100 AI queries per month",
        "Summarize last 3 unread emails",
        "View upcoming schedule",
        "Standard support responses",
      ],
      cta: "Current Plan",
      primary: false,
    },
    {
      name: "Pro",
      price: billingCycle === "monthly" ? "15" : "12",
      description: "Advanced AI assistance and fully automated workflows.",
      features: [
        "Unlimited AI assistant queries",
        "Full Gmail write/read synchronization",
        "Google Calendar auto-scheduling",
        "Smarter multi-turn agent memory",
        "Draft complex communications",
        "Priority email support",
      ],
      cta: "Upgrade to Pro",
      primary: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Custom connectors, robust security controls, and SLA support.",
      features: [
        "Dedicated custom AI agent routing",
        "On-premise / self-hosted options",
        "Unrestricted API integrations",
        "Enterprise-grade data encryption",
        "Dedicated account representative",
        "Custom SLA guarantees",
      ],
      cta: "Contact Sales",
      primary: false,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full items-center justify-start overflow-y-auto custom-scrollbar px-6 py-12 bg-gray-50/50 dark:bg-gray-950/20">
      {/* Header */}
      <div className="text-center max-w-2xl w-full mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl mb-4">
          Flexible Pricing for Smart Assistants
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400">
          Scale your productivity with a dedicated AI assistant for Gmail and Calendar.
        </p>

        {/* Toggle Billing */}
        <div className="mt-8 flex justify-center items-center gap-3">
          <span className={`text-sm font-medium ${billingCycle === "monthly" ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-400"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-12 h-6 bg-purple-600 rounded-full p-1 flex items-center transition-all cursor-pointer"
            aria-label="Toggle billing cycle"
          >
            <div
              className={`w-4 h-4 bg-white rounded-full transition-transform transform ${
                billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm font-medium flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-400"}`}>
            Yearly
            <span className="bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl items-stretch">
        {plans.map((plan) => {
          const isPro = plan.name === "Pro";
          const isFree = plan.name === "Starter";
          return (
            <div
              key={plan.name}
              className={`bg-white dark:bg-gray-950 border rounded-3xl p-8 flex flex-col transition-all relative ${
                plan.primary
                  ? "border-purple-500 dark:border-purple-600 shadow-xl ring-2 ring-purple-100 dark:ring-purple-950/30 -translate-y-2 md:-translate-y-4"
                  : "border-gray-200 dark:border-gray-900 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-800"
              }`}
            >
              {plan.primary && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}

              {/* Title & Description */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 leading-relaxed h-10">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline mb-6 border-b border-gray-100 dark:border-gray-900 pb-6">
                {plan.price !== "Custom" ? (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">${plan.price}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 ml-1">/ month</span>
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-gray-100">Custom</span>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                    <svg
                      className="w-4 h-4 text-purple-600 mt-0.5 mr-3 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {isFree ? (
                <div className="w-full text-center py-3 px-4 rounded-xl text-sm font-semibold bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-800">
                  {plan.cta}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer text-center ${
                    plan.primary
                      ? "bg-purple-600 text-white hover:bg-purple-700 active:scale-98"
                      : "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-950 hover:bg-gray-800 dark:hover:bg-gray-200 active:scale-98"
                  }`}
                >
                  {plan.cta}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-900 transform transition-all text-center relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/20 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600 dark:text-purple-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upgrade Initiated</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              You selected the <strong className="text-purple-600 dark:text-purple-400 font-semibold">{selectedPlan}</strong> plan 
              ({billingCycle === "yearly" ? "billed annually" : "billed monthly"}).
            </p>
            {session ? (
              <div className="text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 p-3 rounded-xl mb-6 border dark:border-purple-900/50">
                Logged in as <strong>{session.user.email}</strong>. Setting up billing panel redirect...
              </div>
            ) : (
              <div className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 p-3 rounded-xl mb-6 border dark:border-amber-900/50">
                Please Sign In to finalize your subscription configuration.
              </div>
            )}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
