"use client";

import { useState } from "react";

import { CalendarPanel } from "@/app/_components/calendar-panel";
import { GmailPanel } from "@/app/_components/gmail-panel";
import { AiChatPanel } from "@/app/_components/ai-chat-panel";

export default function Home() {
  const [tab, setTab] = useState<"ai" | "gmail" | "calendar">("ai");

  return (
    <main>
      <h1>Google Demo</h1>
      <p className="muted">Gmail and Calendar powered by Corsair</p>

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
