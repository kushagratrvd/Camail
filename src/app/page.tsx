"use client";

import { useState } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";

import { CalendarPanel } from "@/app/_components/calendar-panel";
import { GmailPanel } from "@/app/_components/gmail-panel";
import { AiChatPanel } from "@/app/_components/ai-chat-panel";

export default function Home() {
  const [tab, setTab] = useState<"ai" | "gmail" | "calendar">("ai");
  const { data: session, isPending } = useSession();

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Camail</h1>
          <p className="muted">AI assistant for your Gmail and Calendar</p>
        </div>
        
        <div>
          {isPending ? (
            <span className="muted">Loading auth...</span>
          ) : session ? (
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <span className="muted">Logged in as {session.user.name}</span>
              <a href="/api/corsair/connect" className="button" style={{
                background: "#000",
                color: "#fff",
                padding: "0.25rem 0.75rem",
                borderRadius: "0.25rem",
                textDecoration: "none",
                fontSize: "0.875rem"
              }}>
                Connect Integrations
              </a>
              <button type="button" className="link" onClick={() => signOut()}>
                Sign Out
              </button>
            </div>
          ) : (
            <button type="button" className="link" onClick={() => signIn.social({ provider: "google" })}>
              Sign In with Google
            </button>
          )}
        </div>
      </div>

      <p>
        {tab === "ai" ? (
          <strong>AI Chat</strong>
        ) : (
          <button type="button" className="link" onClick={() => setTab("ai")}>
            AI Chat
          </button>
        )}
        {" · "}
        {tab === "gmail" ? (
          <strong>Email</strong>
        ) : (
          <button type="button" className="link" onClick={() => setTab("gmail")}>
            Email
          </button>
        )}
        {" · "}
        {tab === "calendar" ? (
          <strong>Calendar</strong>
        ) : (
          <button type="button" className="link" onClick={() => setTab("calendar")}>
            Calendar
          </button>
        )}
      </p>

      <hr />

      {tab === "ai" && <AiChatPanel />}
      {tab === "gmail" && <GmailPanel />}
      {tab === "calendar" && <CalendarPanel />}
    </main>
  );
}
