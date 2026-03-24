import { NextRequest } from "next/server";

export const maxDuration = 60;

const OPENCLAW_URL = "http://localhost:18789";
const HOOKS_TOKEN = "pepa-hooks-secret-2026";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      try {
        const historyText = Array.isArray(history) && history.length > 0
          ? history.slice(-8).map((m: { role: string; content: string }) =>
              `${m.role === "user" ? "Uživatel" : "Pepa"}: ${m.content}`
            ).join("\n") + "\n\n"
          : "";

        const fullMessage = `${historyText ? `Kontext předchozí konverzace:\n${historyText}` : ""}Uživatel: ${message}`;

        // Pošli do OpenClaw hooks
        const hookRes = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${HOOKS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: fullMessage,
            name: "pepa-webchat",
            sessionKey: "hook:pepa-webchat",
            deliver: false,
            timeoutSeconds: 50,
          }),
        });

        if (!hookRes.ok) {
          throw new Error(`Hook error ${hookRes.status}: ${await hookRes.text()}`);
        }

        const startTime = Date.now();

        // Poll session soubory
        const sessionDir = `${process.env.HOME}/.openclaw/agents/main/sessions`;
        let response = "";

        for (let i = 0; i < 50; i++) {
          await new Promise(r => setTimeout(r, 1000));
          try {
            const { execSync } = await import("child_process");
            const sessions = JSON.parse(
              execSync(`cat ${sessionDir}/sessions.json 2>/dev/null || echo {}`).toString()
            );
            const hookSessionId = sessions["agent:main:hook:pepa-webchat"]?.sessionId;
            if (!hookSessionId) continue;

            const lines = execSync(`tail -30 ${sessionDir}/${hookSessionId}.jsonl 2>/dev/null || echo`).toString().split("\n");
            const reversed = [...lines].reverse();
            const lastAssistant = reversed.find(l => {
              try { const o = JSON.parse(l); return o.type === "message" && o.message?.role === "assistant"; } catch { return false; }
            });

            if (lastAssistant) {
              const o = JSON.parse(lastAssistant);
              const tsRaw = o.timestamp || o.ts || "";
              const msgTime = tsRaw ? new Date(tsRaw).getTime() : 0;
              // Pouze zprávy novější než start
              if (msgTime > startTime - 3000) {
                const text = (o.message.content || [])
                  .filter((c: { type: string }) => c.type === "text")
                  .map((c: { text: string }) => c.text)
                  .join("");
                if (text && !text.includes("HEARTBEAT_OK")) {
                  response = text;
                  break;
                }
              }
            }
          } catch { /* ignoruj */ }
        }

        if (!response) throw new Error("Timeout — Pepa neodpověděl včas");

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: response })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `❌ Chyba: ${msg}` })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
