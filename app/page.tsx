"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
};

const EXAMPLE_QUERIES = [
  "Jaké nové klienty máme za Q1 2026? Odkud přišli?",
  "Kolik máme leadů za posledních 6 měsíců?",
  "Najdi nemovitosti, u kterých chybí data o rekonstrukci.",
  "Jaké nemovitosti jsou aktuálně k prodeji v Holešovicích?",
  "Kolik bylo prodejů celkem a jaká byla celková provize?",
  "Jaké jsou volné termíny prohlídek tento týden?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ahoj! Jsem **Pepa**, váš AI back office operations agent 👊\n\nMůžu vám pomoci s:\n- Dotazy nad firemními daty (klienti, nemovitosti, leady)\n- Hledáním chybějících dat\n- Přehledem prodejů a aktivit\n- Dostupností termínů prohlídek\n\nNa co se chcete zeptat?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: msg },
      { role: "assistant", content: "", loading: true },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const { id } = await res.json();

      // Polling dokud agent neodpoví
      let attempts = 0;
      const poll = async () => {
        if (attempts > 60) {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: "⏱️ Timeout — agent neodpověděl včas.", loading: false }
                : m
            )
          );
          setLoading(false);
          return;
        }
        attempts++;
        const r = await fetch(`/api/chat/${id}`);
        const data = await r.json();
        if (data.status === "done" && data.response) {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, content: data.response, loading: false }
                : m
            )
          );
          setLoading(false);
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 3000);
    } catch {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, content: "❌ Chyba připojení k agentovi.", loading: false }
            : m
        )
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">
          P
        </div>
        <div>
          <h1 className="font-semibold text-lg">Pepa — Back Office Agent</h1>
          <p className="text-xs text-gray-400">AI asistent realitní firmy · Online</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Powered by OpenClaw</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold mr-2 mt-1 flex-shrink-0">
                P
              </div>
            )}
            <div
              className={`max-w-2xl rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-100 rounded-bl-sm"
              }`}
            >
              {msg.loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <p className="text-xs text-gray-500 mb-2 px-1">Příklady dotazů:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Zeptejte se Pepy na data, klienty, nemovitosti..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors"
          >
            Odeslat
          </button>
        </form>
      </div>
    </div>
  );
}
