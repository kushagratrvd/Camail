"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import Link from "next/link";
import { Check, ShieldCheck, AlertCircle } from "lucide-react";

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
    <div className="flex-1 flex flex-col h-full items-center justify-start overflow-y-auto custom-scrollbar px-6 py-12 bg-white dark:bg-[#0f0e13]">
      {/* Header */}
      <div className="text-center max-w-2xl w-full mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl mb-4">
          Flexible Pricing for Smart Assistants
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 font-light">
          Scale your productivity with a dedicated AI assistant for Gmail and Calendar.
        </p>

        {/* Toggle Billing */}
        <div className="mt-8 flex justify-center items-center gap-3">
          <span className={`text-sm font-semibold ${billingCycle === "monthly" ? "text-zinc-900 dark:text-zinc-105" : "text-zinc-400 dark:text-zinc-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="w-12 h-6 bg-zinc-900 dark:bg-zinc-200 rounded-full p-1 flex items-center transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
            aria-label="Toggle billing cycle"
          >
            <div
              className={`w-4 h-4 bg-white dark:bg-zinc-950 rounded-full transition-transform transform ${
                billingCycle === "yearly" ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
          <span className={`text-sm font-semibold flex items-center gap-1.5 ${billingCycle === "yearly" ? "text-zinc-900 dark:text-zinc-105" : "text-zinc-400 dark:text-zinc-500"}`}>
            Yearly
            <span className="bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl items-stretch">
        {plans.map((plan) => {
          const isFree = plan.name === "Starter";
          return (
            <div
              key={plan.name}
              className={`bg-white dark:bg-zinc-950 border rounded-3xl p-8 flex flex-col transition-all relative ${
                plan.primary
                  ? "border-zinc-900 dark:border-zinc-100 shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 -translate-y-2 md:-translate-y-4"
                  : "border-zinc-200 dark:border-zinc-900 shadow-sm hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-800"
              }`}
            >
              {plan.primary && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold px-3 py-1 rounded-full border border-zinc-800 dark:border-zinc-200 uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}

              {/* Title & Description */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed h-10 font-light">{plan.description}</p>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline mb-6 border-b border-zinc-100 dark:border-zinc-900 pb-6">
                {plan.price !== "Custom" ? (
                  <>
                    <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100">${plan.price}</span>
                    <span className="text-sm text-zinc-400 dark:text-zinc-500 ml-1">/ month</span>
                  </>
                ) : (
                  <span className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100">Custom</span>
                )}
              </div>

              {/* Features List */}
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm text-zinc-650 dark:text-zinc-300 font-light">
                    <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100 mt-0.5 mr-3 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              {isFree ? (
                <div className="w-full text-center py-3 px-4 rounded-full text-sm font-semibold bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-850">
                  {plan.cta}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.name)}
                  className={`w-full py-3 px-4 rounded-full text-sm font-semibold shadow-sm transition-all cursor-pointer text-center ${
                    plan.primary
                      ? "bg-zinc-900 dark:bg-zinc-105 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white/90 active:scale-98"
                      : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-850 active:scale-98"
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
          <div className="bg-white dark:bg-zinc-950 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-200 dark:border-zinc-900 transform transition-all text-center relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-900 dark:text-zinc-100">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Upgrade Initiated</h3>
            <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-6 leading-relaxed font-light">
              You selected the <strong className="text-zinc-905 dark:text-white font-semibold">{selectedPlan}</strong> plan 
              ({billingCycle === "yearly" ? "billed annually" : "billed monthly"}).
            </p>
            {session ? (
              <div className="text-xs bg-zinc-50/50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 p-3.5 rounded-3xl mb-6 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2 text-left">
                <ShieldCheck className="w-4 h-4 text-zinc-650 flex-shrink-0 mt-0.5" />
                <span className="font-light">Logged in as <strong>{session.user.email}</strong>. Setting up billing panel redirect...</span>
              </div>
            ) : (
              <div className="text-xs bg-zinc-50/50 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-200 p-3.5 rounded-3xl mb-6 border border-zinc-200 dark:border-zinc-800 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-zinc-650 flex-shrink-0 mt-0.5" />
                <span className="font-light">Please Sign In to finalize your subscription configuration.</span>
              </div>
            )}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-full text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
