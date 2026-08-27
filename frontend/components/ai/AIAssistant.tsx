"use client";

import { useFleet } from "@/context/FleetContext";
import { answerFleetQuestion } from "@/lib/assistant";
import { useState } from "react";

const SUGGESTIONS = [
  "Which trucks are delayed?",
  "Which truck is overloaded?",
  "Find a replacement for T-104.",
  "Show emergency trucks.",
  "Which partner truck is closest to T-104?",
];

export function AIAssistant() {
  const { trucks, partnerTrucks } = useFleet();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    {
      role: "assistant",
      text: "Fleet control assistant ready. Ask about delays, overloads, emergencies, or partner replacements.",
    },
  ]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const answer = answerFleetQuestion(q, trucks, partnerTrucks);
    setMessages((list) => [...list, { role: "user", text: q }, { role: "assistant", text: answer }]);
    setInput("");
  }

  return (
    <section className="card flex h-full min-h-[360px] flex-col p-4">
      <h2 className="font-semibold">AI Logistics Assistant</h2>
      <p className="text-xs text-muted">Prototype replies from live mock data. Wire <code>/api/ai</code> for a real model.</p>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-xl bg-surface-2 p-3 text-sm">
        {messages.map((m, i) => (
          <p key={i} className={m.role === "user" ? "text-right font-medium" : "text-ink"}>
            {m.role === "user" ? "You: " : "Assistant: "}
            {m.text}
          </p>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="rounded-full border border-line px-2 py-1 text-xs" onClick={() => send(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor="ai-input">
          Ask the assistant
        </label>
        <input
          id="ai-input"
          className="flex-1 rounded-xl border border-line bg-surface px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the fleet…"
        />
        <button type="submit" className="rounded-xl bg-blue-700 px-3 py-2 text-white">
          Send
        </button>
      </form>
    </section>
  );
}
