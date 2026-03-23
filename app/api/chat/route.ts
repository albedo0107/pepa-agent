import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const sql = neon(process.env.DATABASE_URL!);
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendToTelegram(userMsg: string, assistantMsg: string) {
  if (!TG_TOKEN || !TG_CHAT_ID) return;
  const clean = assistantMsg
    .replace(/_🔍 Dotazuji databázi..._\n/g, "")
    .replace(/^\[\[reply_to_current\]\]\s*/g, "")
    .replace(/^\]\s*/, "");
  const text = `💬 *Web dotaz:* ${userMsg}\n\n👊 *Pepa:* ${clean}`;
  await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: "Markdown" }),
  }).catch(() => {});
}

async function runSQL(query: string): Promise<string> {
  try {
    const rows = await sql.query(query) as Record<string, unknown>[];
    if (!rows || rows.length === 0) return "Žádné výsledky";
    const headers = Object.keys(rows[0]);
    const lines = rows.map((r) =>
      headers.map(h => String(r[h] ?? "")).join(" | ")
    );
    return [headers.join(" | "), ...lines].join("\n");
  } catch (e: unknown) {
    return `SQL error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

const TODAY = new Date().toLocaleDateString("cs-CZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const TODAY_ISO = new Date().toISOString().split("T")[0];

const SYSTEM_PROMPT = `Jsi Pepa, AI back office agent realitní firmy. Vždy odpovídej POUZE v češtině. Nikdy nepoužívej jiné jazyky ani písma.
Dnešní datum: ${TODAY} (${TODAY_ISO})
Příští týden: ${new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]} – ${new Date(Date.now() + 11 * 86400000).toISOString().split("T")[0]}
DŮLEŽITÉ:
- Volej sql_query MAX 1-2x na dotaz.
- Když najdeš volný termín v kalendáři, VŽDY ihned zavolej open_calendar_event tool — neptej se jestli zapsat, rovnou připrav událost.
- Když pisuješ email, VŽDY zavolej open_gmail_draft tool — neptej se, rovnou připrav draft.

DB tabulky:
- klienti (id, jmeno, email, telefon, zdroj, datum_akvizice)
- nemovitosti (id, nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy)
- leady (id, jmeno, email, zdroj, datum, nemovitost_id, stav)
- prodeje (id, nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc)
- kalendar (id, datum, cas_od, cas_do, typ, popis, obsazeno)`;

const tools: Anthropic.Tool[] = [
  {
    name: "sql_query",
    description: "SQL SELECT dotaz na firemní DB.",
    input_schema: {
      type: "object" as const,
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "open_calendar_event",
    description: "Otevře Google Calendar s předvyplněnou událostí k potvrzení. Použij vždy když přidáváš schůzku nebo událost do kalendáře.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Název události" },
        date: { type: "string", description: "Datum (YYYY-MM-DD)" },
        start_time: { type: "string", description: "Začátek (HH:MM)" },
        end_time: { type: "string", description: "Konec (HH:MM)" },
        description: { type: "string", description: "Popis události" },
        location: { type: "string", description: "Místo (volitelné)" },
      },
      required: ["title", "date", "start_time", "end_time"],
    },
  },
  {
    name: "open_gmail_draft",
    description: "Otevře Gmail compose okno s předvyplněným emailem (draft). Použij když má uživatel odeslat email — vytvoří se draft v Gmailu čekající na schválení.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Email příjemce" },
        subject: { type: "string", description: "Předmět emailu" },
        body: { type: "string", description: "Text emailu" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "calendar_find_slot",
    description: "Najde volné časové sloty v kalendáři pro zadaný den nebo rozsah dní.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: { type: "string", description: "Od data (YYYY-MM-DD)" },
        to: { type: "string", description: "Do data (YYYY-MM-DD)" },
        duration_minutes: { type: "number", description: "Délka schůzky v minutách" },
      },
      required: ["from"],
    },
  },
  {
    name: "calendar_add_event",
    description: "Přidá novou schůzku nebo událost do kalendáře.",
    input_schema: {
      type: "object" as const,
      properties: {
        datum: { type: "string", description: "Datum (YYYY-MM-DD)" },
        cas_od: { type: "string", description: "Začátek (HH:MM)" },
        cas_do: { type: "string", description: "Konec (HH:MM)" },
        popis: { type: "string", description: "Název/popis události" },
        klient_jmeno: { type: "string", description: "Jméno klienta (volitelné)" },
        typ: { type: "string", description: "Typ: schůzka, prohlídka, blokováno" },
      },
      required: ["datum", "cas_od", "cas_do", "popis"],
    },
  },
  {
    name: "create_document",
    description: "Vytvoří dokument (PDF, Word nebo PowerPoint) ke stažení. Pro PPTX použij `slides` pole pro více slidů.",
    input_schema: {
      type: "object" as const,
      properties: {
        format: { type: "string", enum: ["pdf", "docx", "pptx"] },
        title: { type: "string" },
        content: { type: "string", description: "Obsah pro PDF/DOCX" },
        data: {
          type: "object",
          properties: {
            headers: { type: "array", items: { type: "string" } },
            rows: { type: "array", items: { type: "array", items: { type: "string" } } },
          },
        },
        slides: {
          type: "array",
          description: "Pro PPTX: pole slidů. Slide 0 = titulní, ostatní jsou obsahové.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string", description: "Text obsahu (odrážky začínají -)" },
              table: {
                type: "object",
                properties: {
                  headers: { type: "array", items: { type: "string" } },
                  rows: { type: "array", items: { type: "array", items: { type: "string" } } },
                },
              },
            },
          },
        },
      },
      required: ["format", "title"],
    },
  },
  {
    name: "create_chart",
    description: "Vytvoří graf z dat. Použij když uživatel chce vizualizaci, graf nebo přehled dat.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["bar", "line", "pie"], description: "Typ grafu" },
        title: { type: "string", description: "Název grafu" },
        data: {
          type: "array",
          description: "Pole objektů {name, value} nebo {name, value1, value2...}",
          items: { type: "object" }
        },
        dataKeys: { type: "array", items: { type: "string" }, description: "Klíče dat (default: ['value'])" },
      },
      required: ["type", "title", "data"],
    },
  },
];

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (text: string) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));

      // Sestav historii pro Claude
      const historyMessages: Anthropic.MessageParam[] = history
        .filter((m: { role: string; content: string }) => m.role !== "assistant" || !m.content.includes("Ahoj! Jsem **Pepa**"))
        .map((m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      let fullResponse = "";

      const messages: Anthropic.MessageParam[] = [
        ...historyMessages,
        { role: "user", content: message },
      ];

      for (let i = 0; i < 5; i++) {
        // Použij streaming pro finální odpověď
        const streamResp = client.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools,
          messages,
        });

        // Sbírej všechny tool calls během streamu
        const toolCalls: { id: string; name: string; input: string }[] = [];
        let currentToolIdx = -1;
        let fullContent: Anthropic.ContentBlock[] = [];
        let stopReason = "";

        for await (const event of streamResp) {
          if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            toolCalls.push({ id: event.content_block.id, name: event.content_block.name, input: "" });
            currentToolIdx = toolCalls.length - 1;
            const name = event.content_block.name;
            // Pošli jako indikátor (ne jako text odpovědi)
            const indicators: Record<string, string> = { sql_query: "🔍 Dotazuji databázi...", create_chart: "📊 Generuji graf...", create_document: "📄 Připravuji dokument...", calendar_find_slot: "📅 Hledám volný čas...", calendar_add_event: "📅 Přidávám do kalendáře...", open_gmail_draft: "✉️ Připravuji email draft...", open_calendar_event: "📅 Připravuji kalendářovou událost..." };
            if (indicators[name]) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ indicator: indicators[name] })}\n\n`));
          }
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              fullResponse += event.delta.text;
              send(event.delta.text);
            } else if (event.delta.type === "input_json_delta" && currentToolIdx >= 0) {
              toolCalls[currentToolIdx].input += event.delta.partial_json;
            }
          }
          if (event.type === "message_delta") stopReason = event.delta.stop_reason || "";
          if (event.type === "message_stop") {
            const msg = await streamResp.finalMessage();
            fullContent = msg.content;
          }
        }

        if (stopReason === "end_turn") break;

        if (stopReason === "tool_use" && toolCalls.length > 0) {
          messages.push({ role: "assistant", content: fullContent });
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const tool of toolCalls) {
            try {
              const parsed = JSON.parse(tool.input);
              if (tool.name === "sql_query") {
                const sqlResult = await runSQL(parsed.query);
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: sqlResult });
              } else if (tool.name === "create_chart") {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chart: parsed })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: "Graf zobrazen." });
              } else if (tool.name === "open_calendar_event") {
                const { title, date, start_time, end_time, description: desc, location } = parsed;
                const fmt = (d: string, t: string) => `${d.replace(/-/g, "")}T${t.replace(":", "")}00`;
                const params = new URLSearchParams({
                  action: "TEMPLATE",
                  text: title,
                  dates: `${fmt(date, start_time)}/${fmt(date, end_time)}`,
                  ...(desc ? { details: desc } : {}),
                  ...(location ? { location } : {}),
                });
                const calUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ calendarEvent: { url: calUrl, title, date, start_time, end_time, description: desc } })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Událost "${title}" připravena pro Google Calendar (${date} ${start_time}-${end_time}).` });
              } else if (tool.name === "open_gmail_draft") {
                const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(parsed.to)}&su=${encodeURIComponent(parsed.subject)}&body=${encodeURIComponent(parsed.body)}`;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ gmailDraft: { url: gmailUrl, to: parsed.to, subject: parsed.subject, preview: parsed.body.slice(0, 150) } })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Gmail draft připraven. Uživatel může kliknout pro otevření v Gmailu.` });
              } else if (tool.name === "calendar_find_slot") {
                const { from, to, duration_minutes = 60 } = parsed;
                const toDate = to || new Date(new Date(from).getTime() + 5 * 86400000).toISOString().split("T")[0];
                const slots = await runSQL(`SELECT datum, cas_od, cas_do, obsazeno, popis, klient_jmeno, typ FROM kalendar WHERE datum >= '${from}' AND datum <= '${toDate}' ORDER BY datum, cas_od`);
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Kalendář ${from}–${toDate}:\n${slots}\n\nHledaná délka: ${duration_minutes} min. Volné sloty = obsazeno=false.` });
              } else if (tool.name === "calendar_add_event") {
                const addResult = await fetch("http://localhost:3000/api/calendar", {
                  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed),
                }).then(r => r.json()).catch(() => ({ error: "Chyba" }));
                const msg = addResult.error ? `Chyba: ${addResult.error}` : `Schůzka přidána! ${parsed.datum} ${parsed.cas_od}–${parsed.cas_do}: "${parsed.popis}"`;
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: msg });
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ calendarUpdate: true })}\n\n`));
              } else if (tool.name === "create_document") {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ document: parsed })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: "Dokument připraven ke stažení." });
              }
            } catch {}
          }

          if (toolResults.length > 0) {
            messages.push({ role: "user", content: toolResults });
          }
        }
      }

      // Pošli na Telegram
      await sendToTelegram(message, fullResponse);

      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
