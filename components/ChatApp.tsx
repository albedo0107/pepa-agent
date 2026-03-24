"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
const ChartRenderer = dynamic(() => import("./ChartRenderer"), { ssr: false });

type ChartData = {
  type: "bar" | "line" | "pie";
  title: string;
  data: { name: string; value: number }[];
  dataKeys?: string[];
};

type DocumentData = {
  format: "pdf" | "docx" | "pptx";
  title: string;
  content: string;
  data?: { headers: string[]; rows: string[][] };
};

type GmailDraft = {
  url: string;
  to: string;
  subject: string;
  preview: string;
};

type LeadScore = {
  lead_id: number;
  skore: number;
  priorita: string;
  doporucena_akce: string;
  zduvodneni?: string;
};

type CalendarEvent = {
  url: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  description?: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  loading?: boolean;
  chart?: ChartData;
  document?: DocumentData;
  indicator?: string;
  gmailDraft?: GmailDraft;
  calendarEvent?: CalendarEvent;
  leadScore?: LeadScore;
};

function sanitizeMessage(text: string): string {
  // Odstraň [[reply_to_current]] a [[reply_to:...]] tagy
  text = text.replace(/\[\[\s*reply_to[^\]]*\]\]\s*/gi, "");
  // Odstraň JSON metadata bloky (sender metadata z Telegramu)
  text = text.replace(/^json\s*\{[\s\S]*?\}\s*/gm, "");
  // Odstraň osamocené { } bloky na začátku
  text = text.replace(/^\s*\{[\s\S]*?\}\s*\n/gm, "");
  return text.trim();
}

const WELCOME_MSG: Message = {
  role: "assistant",
  content: "Ahoj! Jsem **Pepa**, váš AI back office operations agent 👊\n\nMůžu vám pomoci s:\n- Dotazy nad firemními daty (klienti, nemovitosti, leady)\n- Hledáním chybějících dat\n- Přehledem prodejů a aktivit\n- Dostupností termínů prohlídek\n\nNa co se chcete zeptat?",
};

const EXAMPLE_QUERIES = [
  "Jaké nové klienty máme za Q1 2026? Odkud přišli?",
  "Kolik máme leadů za posledních 6 měsíců?",
  "Najdi nemovitosti, u kterých chybí data o rekonstrukci.",
  "Jaké nemovitosti jsou aktuálně k prodeji v Holešovicích?",
  "Kolik bylo prodejů a jaká byla celková provize?",
  "Jaké jsou volné termíny prohlídek tento týden?",
];

function renderContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}

export default function ChatApp({ embedded = false, onCalendarUpdate }: { embedded?: boolean; onCalendarUpdate?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Extras se aplikují na poslední zprávu po [DONE]
  const extrasRef = useRef<Partial<Message>>({});

  // Načti historii z DB
  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then(({ messages: saved }) => {
        if (Array.isArray(saved) && saved.length > 0) {
          setMessages(saved.map((m: Message) => ({ ...m, content: sanitizeMessage(m.content) })));
        }
      })
      .catch(() => {});
  }, []);

  // Ulož historii do DB
  useEffect(() => {
    if (messages.length > 1 && !messages.some((m) => m.loading)) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }).catch(() => {});
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME_MSG]);
    fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [WELCOME_MSG] }),
    }).catch(() => {});
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setLoading(true);

    const newMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages([...newMessages, { role: "assistant", content: "", loading: true }]);

    try {
      abortRef.current = new AbortController();
      extrasRef.current = {};
      // Lokální kopie extras — garantovaně aktuální při [DONE]
      let localExtras: Partial<Message> = {};
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          message: msg,
          history: newMessages.filter((m) => m.content !== WELCOME_MSG.content).slice(-20),
        }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            // Aplikuj extras na konci
            setMessages((prev) => prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, loading: false, content: fullText, indicator: undefined, ...localExtras }
                : m
            ));
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              fullText += parsed.text;
              // Průběžný streaming update
              setMessages((prev) => prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, loading: false, content: fullText, indicator: undefined }
                  : m
              ));
            } else if (parsed.chart) localExtras = { ...localExtras, chart: parsed.chart };
            else if (parsed.document) localExtras = { ...localExtras, document: parsed.document };
            else if (parsed.leadScore) localExtras = { ...localExtras, leadScore: parsed.leadScore };
            else if (parsed.calendarEvent) localExtras = { ...localExtras, calendarEvent: parsed.calendarEvent };
            else if (parsed.gmailDraft) localExtras = { ...localExtras, gmailDraft: parsed.gmailDraft };
            else if (parsed.calendarUpdate) onCalendarUpdate?.();
            else if (parsed.indicator) {
              setMessages((prev) => prev.map((m, i) =>
                i === prev.length - 1 ? { ...m, indicator: parsed.indicator } : m
              ));
            }
          } catch {}
        }
      }

      // Fallback — aplikuj extras pokud [DONE] nepřišlo
      if (Object.keys(localExtras).length > 0) {
        setMessages((prev) => prev.map((m, i) =>
          i === prev.length - 1
            ? { ...m, loading: false, ...localExtras }
            : m
        ));
      }

    } catch (e: unknown) {
      const isAbort = e instanceof Error && e.name === "AbortError";
      if (!isAbort) {
        setMessages((prev) =>
          prev.map((m, i) => i === prev.length - 1 ? { ...m, content: "❌ Chyba připojení.", loading: false } : m)
        );
      } else {
        setMessages((prev) =>
          prev.map((m, i) => i === prev.length - 1 ? { ...m, loading: false } : m)
        );
      }
    }
    abortRef.current = null;
    setLoading(false);
  };

  return (
    <div className={`flex flex-col ${embedded ? "h-screen" : "h-screen"} text-gray-100`} style={{ background: embedded ? "transparent" : "linear-gradient(135deg, #0f1a1c 0%, #0d1f2d 100%)" }} suppressHydrationWarning>
      {/* Header */}
      {!embedded && <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-xl font-bold">P</div>
        <div>
          <h1 className="font-semibold text-lg">Pepa — Back Office Agent</h1>
          <p className="text-xs text-gray-400">AI asistent realitní firmy · Online</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Powered by OpenClaw</span>
          <button onClick={clearHistory} className="text-xs text-gray-500 hover:text-gray-300 transition-colors border border-gray-700 rounded px-2 py-1">
            Smazat historii
          </button>
        </div>
      </header>}
      {embedded && (
        <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-300">💬 Chat s Pepou</span>
          <button onClick={clearHistory} className="ml-auto text-xs text-gray-500 hover:text-gray-300 border border-gray-700 rounded px-2 py-0.5">Smazat</button>
        </div>
      )}
      {!embedded && (
        <div className="border-b border-gray-800 px-6 py-2 flex flex-wrap gap-2 overflow-x-auto">
          {[
            { icon: "📊", label: "Databáze & grafy" },
            { icon: "📁", label: "Google Drive" },
            { icon: "📅", label: "Google Calendar" },
            { icon: "✉️", label: "Gmail draft" },
            { icon: "📄", label: "PPTX / DOCX" },
            { icon: "🔍", label: "Sreality monitoring" },
            { icon: "💬", label: "Telegram sync" },
            { icon: "🧠", label: "Trvalá paměť" },
          ].map(cap => (
            <span key={cap.label} className="flex items-center gap-1 text-xs bg-gray-800/60 border border-gray-700/50 rounded-full px-3 py-1 text-gray-400 whitespace-nowrap">
              {cap.icon} {cap.label}
            </span>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold mr-2 mt-1 flex-shrink-0">P</div>
            )}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-800 text-gray-100 rounded-bl-sm"
            }`}>
              {msg.loading ? (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              ) : (
                <>
                  {msg.indicator && !msg.content && (
                    <span className="text-gray-400 text-xs italic animate-pulse">{msg.indicator}</span>
                  )}
                  {msg.content && <span dangerouslySetInnerHTML={{ __html: renderContent(sanitizeMessage(msg.content)) }} />}
                  {msg.leadScore && (
                    <div className="mt-2 rounded-lg border border-yellow-700/50 bg-yellow-900/10 p-3 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-yellow-400">🎯 Lead scoring</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          msg.leadScore.priorita === "vysoká" ? "bg-red-600/80 text-white" :
                          msg.leadScore.priorita === "střední" ? "bg-yellow-600/80 text-white" :
                          "bg-green-700/80 text-white"
                        }`}>
                          {msg.leadScore.priorita === "vysoká" ? "🔴" : msg.leadScore.priorita === "střední" ? "🟡" : "🟢"} {msg.leadScore.priorita.toUpperCase()} PRIORITA
                        </span>
                        <span className="ml-auto text-lg font-bold text-white">{msg.leadScore.skore}<span className="text-xs text-gray-400">/100</span></span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${msg.leadScore.skore >= 75 ? "bg-red-500" : msg.leadScore.skore >= 50 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${msg.leadScore.skore}%` }} />
                      </div>
                      <div className="text-xs text-yellow-200 font-medium">⚡ {msg.leadScore.doporucena_akce}</div>
                      {msg.leadScore.zduvodneni && <div className="text-xs text-gray-400 italic">{msg.leadScore.zduvodneni}</div>}
                    </div>
                  )}
                  {msg.calendarEvent && (
                    <div className="mt-2 rounded-lg border border-blue-700/50 bg-blue-900/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-blue-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                        Událost připravena pro Google Calendar
                      </div>
                      <div className="text-xs text-gray-300 font-medium">{msg.calendarEvent.title}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(msg.calendarEvent.date).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" })}
                        {" · "}{msg.calendarEvent.start_time}–{msg.calendarEvent.end_time}
                      </div>
                      {msg.calendarEvent.description && <div className="text-xs text-gray-500 italic">{msg.calendarEvent.description}</div>}
                      <a href={msg.calendarEvent.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                        Otevřít v Google Calendar
                      </a>
                    </div>
                  )}
                  {msg.gmailDraft && (
                    <div className="mt-2 rounded-lg border border-emerald-700/50 bg-emerald-900/10 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        Email draft připraven
                      </div>
                      <div className="text-xs text-gray-300"><span className="text-gray-500">Komu: </span>{msg.gmailDraft.to}</div>
                      <div className="text-xs text-gray-300"><span className="text-gray-500">Předmět: </span>{msg.gmailDraft.subject}</div>
                      <div className="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-2">{msg.gmailDraft.preview}...</div>
                      <a
                        href={msg.gmailDraft.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                        Otevřít v Gmailu a odeslat
                      </a>
                    </div>
                  )}
                  {msg.chart && <ChartRenderer chart={msg.chart} />}
                  {msg.document && (
                    <div className="mt-2">
                      <a
                        href="#"
                        onClick={async (e) => {
                          e.preventDefault();
                          const res = await fetch("/api/generate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(msg.document),
                          });
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const fmt = msg.document!.format;
                          if (fmt === "pdf") {
                            window.open(url, "_blank");
                          } else {
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${msg.document!.title}.${fmt}`;
                            a.click();
                          }
                        }}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                      >
                        📄 {msg.document.format === "pdf" ? "Otevřít" : "Stáhnout"} {msg.document.format.toUpperCase()} — {msg.document.title}
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested queries */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-2 px-1">Příklady dotazů:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <button key={q} onClick={() => sendMessage(q)}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-800 px-4 py-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Zeptejte se Pepy na data, klienty, nemovitosti..."
            disabled={loading}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50 placeholder-gray-500"
          />
          {loading ? (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2"
            >
              ⏹ Stop
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-3 text-sm font-medium transition-colors">
              Odeslat
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
