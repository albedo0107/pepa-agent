#!/usr/bin/env node
// Sync Telegram session → DB history každých 10 sekund

import { readFileSync, writeFileSync, existsSync } from "fs";

const TELEGRAM_SESSION = `${process.env.HOME}/.openclaw/agents/main/sessions/39b747f6-2f95-4a37-aa82-8e1a4b303d68.jsonl`;
const API_URL = "http://localhost:3000/api/history/append";
const STATE_FILE = "/tmp/sync-telegram-state.json";

// Načti poslední synced timestamp
function loadState() {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {}
  return { lastTimestamp: 0 };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state));
}

function cleanText(text) {
  return text
    .replace(/Conversation info \(untrusted metadata\):[\s\S]*?```\s*/g, "")
    .replace(/Sender \(untrusted metadata\):[\s\S]*?```\s*/g, "")
    .replace(/^\[.*?\d{4}\]\s*/m, "")
    .trim();
}

function getTelegramMessages() {
  try {
    const lines = readFileSync(TELEGRAM_SESSION, "utf8").split("\n").filter(Boolean);
    const msgs = [];
    for (const line of lines) {
      try {
        const o = JSON.parse(line);
        if (o.type !== "message") continue;
        const role = o.message?.role;
        if (role !== "user" && role !== "assistant") continue;
        const ts = new Date(o.timestamp || 0).getTime();
        const content = o.message?.content;
        let text = Array.isArray(content)
          ? content.find(c => c?.type === "text")?.text || ""
          : String(content || "");
        const clean = cleanText(text);
        if (!clean) continue;
        if (clean.includes("PEPA_WEBCHAT")) continue;
        if (clean.includes("history/append")) continue;
        msgs.push({ role, content: clean, ts });
      } catch {}
    }
    return msgs;
  } catch { return []; }
}

async function sync() {
  const state = loadState();
  const msgs = getTelegramMessages();
  
  // Vezmi jen zprávy novější než poslední sync
  const newMsgs = msgs.filter(m => m.ts > state.lastTimestamp);
  if (newMsgs.length === 0) return;

  // Páruj user+assistant
  let maxTs = state.lastTimestamp;
  for (let i = 0; i < newMsgs.length - 1; i++) {
    if (newMsgs[i].role === "user" && newMsgs[i+1].role === "assistant") {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: newMsgs[i].content, assistant: newMsgs[i+1].content }),
        });
        if (res.ok) {
          console.log(`[sync] ✅ "${newMsgs[i].content.slice(0, 50)}"`);
          maxTs = Math.max(maxTs, newMsgs[i+1].ts);
          i++; // přeskoč assistant zprávu
        }
      } catch (e) { console.error("[sync] ❌", e.message); }
    }
  }

  if (maxTs > state.lastTimestamp) saveState({ lastTimestamp: maxTs });
}

// Inicializuj state — nastav lastTimestamp na nejnovější existující zprávu
const state = loadState();
if (state.lastTimestamp === 0) {
  const msgs = getTelegramMessages();
  if (msgs.length > 0) {
    const lastTs = msgs[msgs.length - 1].ts;
    saveState({ lastTimestamp: lastTs });
    console.log(`🔄 Telegram sync inicializován — ignoruji starší zprávy (do ${new Date(lastTs).toISOString()})`);
  }
} else {
  console.log(`🔄 Telegram sync spuštěn — od ${new Date(state.lastTimestamp).toISOString()}`);
}

setInterval(sync, 10000);
