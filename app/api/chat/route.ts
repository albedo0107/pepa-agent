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
const DRIVE_FOLDER = "https://drive.google.com/drive/folders/1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ";
const DRIVE_FILES: Record<string, string> = {
  "nove_leady.csv": "17kU39gMHZq5JD5ieFEiAL9o1kQD2cal3",
};
const TODAY_ISO = new Date().toISOString().split("T")[0];

// Dynamicky přidej soubory z Drive při každém spuštění
async function getDriveFiles(): Promise<string> {
  try {
    const html = await fetch(DRIVE_FOLDER, { headers: { "User-Agent": "Mozilla/5.0" } }).then(r => r.text());
    const files: string[] = [];
    const matches = html.matchAll(/"([a-zA-Z0-9_-]{25,})".*?"([^"]+\.(csv|docx|xlsx|pdf|txt))"/g);
    for (const m of matches) {
      files.push(`- ${m[2]} (ID: ${m[1]}) — https://drive.google.com/uc?export=download&id=${m[1]}`);
      DRIVE_FILES[m[2]] = m[1];
    }
    return files.length > 0 ? files.join("\n") : Object.entries(DRIVE_FILES).map(([n, id]) => `- ${n} (ID: ${id})`).join("\n");
  } catch {
    return Object.entries(DRIVE_FILES).map(([n, id]) => `- ${n} (ID: ${id}) — https://drive.google.com/uc?export=download&id=${id}`).join("\n");
  }
}

const SYSTEM_PROMPT_BASE = `Jsi Pepa, AI back office agent realitní firmy. Vždy odpovídej POUZE v češtině. Nikdy nepoužívej jiné jazyky ani písma.
Dnešní datum: ${TODAY} (${TODAY_ISO})
Příští týden: ${new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]} – ${new Date(Date.now() + 11 * 86400000).toISOString().split("T")[0]}
DŮLEŽITÉ:
- Volej sql_query MAX 1x na dotaz — zahrň vše do jednoho dotazu.
- Nikdy neopakuj "Perfektní!", "Výborně!" apod. před každou akcí. Jen jednou na začátku max.
- Když najdeš volný termín v kalendáři, VŽDY ihned zavolej open_calendar_event tool.
- Když píšeš email, VŽDY zavolej open_gmail_draft tool.
- Při importu nebo přidání nového leadu VŽDY zavolej score_lead tool.
- Když uživatel chce naplánovat schůzku s klientem nebo více lidmi, VŽDY použij smart_calendar_orchestrate tool (ne calendar_find_slot). Tento tool automaticky respektuje buffer časy a kontroluje konflikty.

LEAD SCORING pravidla:
- Zdroj "doporučení" = +30 bodů (nejvyšší konverze)
- Zdroj "web" = +20 bodů
- Zdroj "sreality/bezrealitky" = +10 bodů
- Budget nad 10M = +20 bodů
- Zájem o konkrétní nemovitost = +15 bodů
- Priorita vysoká (skóre 75-100): "Zavolat do 2 hodin"
- Priorita střední (50-74): "Kontaktovat do 24 hodin"
- Priorita nízká (0-49): "Sledovat, email do týdne"

DB tabulky:
- klienti (id, jmeno, email, telefon, zdroj, datum_akvizice)
- nemovitosti (id, nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy)
- leady (id, jmeno, email, zdroj, datum, nemovitost_id, stav)
- prodeje (id, nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc)
- kalendar (id, datum, cas_od, cas_do, typ, popis, obsazeno)

Google Drive firemní složka: ${DRIVE_FOLDER}
Soubory v Drive:
${Object.entries(DRIVE_FILES).map(([n, id]) => `- ${n}: https://drive.google.com/uc?export=download&id=${id}`).join("\n")}
Při čtení Drive souborů VŽDY použij read_drive_document tool s příslušnou URL.`;

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
    name: "score_lead",
    description: "Vyhodnotí a ohodnotí lead skórem 0-100 a uloží do DB. Volej vždy při přidání nebo importu nového leadu.",
    input_schema: {
      type: "object" as const,
      properties: {
        lead_id: { type: "number", description: "ID leadu v databázi" },
        skore: { type: "number", description: "Skóre 0-100 (100 = nejhorší lead)" },
        priorita: { type: "string", enum: ["vysoká", "střední", "nízká"], description: "Priorita leadu" },
        doporucena_akce: { type: "string", description: "Konkrétní doporučená akce, např. 'Zavolat do 2 hodin'" },
        zduvodneni: { type: "string", description: "Krátké zdůvodnění skóre" },
      },
      required: ["lead_id", "skore", "priorita", "doporucena_akce"],
    },
  },
  {
    name: "read_drive_document",
    description: "Přečte dokument z Google Drive složky (veřejně sdílený). Použij když uživatel chce přečíst, zpracovat nebo importovat dokument z Drive.",
    input_schema: {
      type: "object" as const,
      properties: {
        file_url: { type: "string", description: "Přímý link na soubor (drive.google.com/file/d/ID nebo docs.google.com)" },
        action: { type: "string", enum: ["read", "import_to_db"], description: "read = přečíst obsah, import_to_db = extrahovat data a uložit do DB" },
      },
      required: ["file_url"],
    },
  },
  {
    name: "list_drive_folder",
    description: "Zobrazí seznam souborů ve sdílené Google Drive složce.",
    input_schema: {
      type: "object" as const,
      properties: {
        folder_url: { type: "string", description: "Link na Google Drive složku" },
      },
      required: ["folder_url"],
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
    name: "smart_calendar_orchestrate",
    description: "Smart Calendar Orchestration — najde nejlepší volný slot pro schůzku s více účastníky, respektuje buffer časy mezi schůzkami a kontroluje konflikty. Použij když uživatel chce naplánovat schůzku s klientem nebo více lidmi.",
    input_schema: {
      type: "object" as const,
      properties: {
        ucastnici: { type: "array", items: { type: "string" }, description: "Jména účastníků (klienti, kolegové)" },
        from: { type: "string", description: "Hledat od data (YYYY-MM-DD)" },
        to: { type: "string", description: "Hledat do data (YYYY-MM-DD)" },
        duration_minutes: { type: "number", description: "Délka schůzky v minutách (default 60)" },
        buffer_minutes: { type: "number", description: "Buffer čas před/po schůzce v minutách (default 15)" },
        preferred_hours: { type: "string", description: "Preferovaný čas např. '9:00-17:00'" },
        typ: { type: "string", description: "Typ: schůzka, prohlídka" },
        poznamka: { type: "string", description: "Název/popis schůzky" },
      },
      required: ["from", "duration_minutes"],
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
    description: "Vytvoří dokument ke stažení. Formáty: 'docx' (Word, ideální pro reporty a přehledy), 'pptx' (prezentace, použij slides pole), 'pdf' (HTML report). Pro datové přehledy a reporty VŽDY používej 'docx'.",
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

      for (let i = 0; i < 3; i++) {
        // Použij streaming pro finální odpověď
        const streamResp = client.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 4096,
          system: SYSTEM_PROMPT_BASE,
          tools,
          messages,
          // Po 2. iteraci zakáž tools aby Claude odpověděl textem
          ...(i >= 2 ? { tool_choice: { type: "none" as const } } : {}),
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
            const indicators: Record<string, string> = { sql_query: "🔍 Dotazuji databázi...", create_chart: "📊 Generuji graf...", create_document: "📄 Připravuji dokument...", calendar_find_slot: "📅 Hledám volný čas...", smart_calendar_orchestrate: "🗓️ Orchestruji kalendář účastníků...", calendar_add_event: "📅 Přidávám do kalendáře...", open_gmail_draft: "✉️ Připravuji email draft...", open_calendar_event: "📅 Připravuji kalendářovou událost..." };
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
              } else if (tool.name === "score_lead") {
                const { lead_id, skore, priorita, doporucena_akce, zduvodneni } = parsed;
                const result = await runSQL(`UPDATE leady SET skore=${skore}, priorita='${priorita}', doporucena_akce='${doporucena_akce}' WHERE id=${lead_id} RETURNING id, jmeno, skore, priorita, doporucena_akce`);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ leadScore: { lead_id, skore, priorita, doporucena_akce, zduvodneni } })}\n\n`));
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Lead #${lead_id} ohodnocen: ${skore}/100, ${priorita} priorita. ${result}` });
              } else if (tool.name === "read_drive_document") {
                try {
                  const baseUrl = process.env.VERCEL_URL
                    ? `https://${process.env.VERCEL_URL}`
                    : "http://localhost:3000";
                  const res = await fetch(`${baseUrl}/api/drive/read`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ file_url: parsed.file_url }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Dokument přečten (${data.type}, ${data.pages || 1} stran):\n\n${data.text}` });
                  } else {
                    toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Chyba: ${data.error}` });
                  }
                } catch (e) {
                  toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Chyba při čtení: ${e}` });
                }
              } else if (tool.name === "list_drive_folder") {
                try {
                  const res = await fetch(parsed.folder_url, { headers: { "User-Agent": "Mozilla/5.0" } });
                  const html = await res.text();
                  // Extrahuj jména souborů z Drive HTML
                  const files = [...html.matchAll(/"([^"]+\.(pdf|docx|xlsx|txt|csv|doc))"/gi)].map(m => m[1]);
                  const unique = [...new Set(files)].slice(0, 20);
                  toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: unique.length > 0 ? `Soubory ve složce:\n${unique.join("\n")}` : "Složka je prázdná nebo nepřístupná. Nahraj soubory do složky a zkus znovu." });
                } catch (e) {
                  toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: `Chyba: ${e}` });
                }
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
              } else if (tool.name === "smart_calendar_orchestrate") {
                const { ucastnici = [], from, to, duration_minutes = 60, buffer_minutes = 15, preferred_hours = "9:00-17:00", typ = "schůzka", poznamka } = parsed;
                const toDate = to || new Date(new Date(from).getTime() + 7 * 86400000).toISOString().split("T")[0];
                const [prefStart, prefEnd] = preferred_hours.split("-").map((t: string) => t.trim());
                const [prefStartH, prefStartM] = prefStart.split(":").map(Number);
                const [prefEndH, prefEndM] = prefEnd.split(":").map(Number);
                const prefStartMin = prefStartH * 60 + (prefStartM || 0);
                const prefEndMin = prefEndH * 60 + (prefEndM || 0);

                // Načti obsazené sloty
                const existingRaw = await sql`
                  SELECT datum::text, cas_od, cas_do, popis, klient_jmeno
                  FROM kalendar
                  WHERE datum >= ${from} AND datum <= ${toDate} AND obsazeno = true
                  ORDER BY datum, cas_od
                `;

                // Najdi volné sloty s bufferem
                const suggestions: { datum: string; cas_od: string; cas_do: string; conflicts: string[] }[] = [];
                const current = new Date(from);
                const end = new Date(toDate);

                while (current <= end && suggestions.length < 5) {
                  const iso = current.toISOString().split("T")[0];
                  const dayEvents = existingRaw.filter((e: Record<string, unknown>) => e.datum === iso);

                  // Generuj kandidáty po 30 min
                  for (let startMin = prefStartMin; startMin + duration_minutes <= prefEndMin; startMin += 30) {
                    const endMin = startMin + duration_minutes;
                    const bufferedStart = startMin - buffer_minutes;
                    const bufferedEnd = endMin + buffer_minutes;

                    const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

                    // Zkontroluj konflikty (s bufferem)
                    const conflicts = dayEvents.filter((e: Record<string, unknown>) => {
                      const eStart = (e.cas_od as string).split(":").slice(0, 2).map(Number).reduce((h: number, m: number, i: number) => i === 0 ? h * 60 + m : h + m, 0);
                      const eEnd = (e.cas_do as string).split(":").slice(0, 2).map(Number).reduce((h: number, m: number, i: number) => i === 0 ? h * 60 + m : h + m, 0);
                      return bufferedStart < eEnd && bufferedEnd > eStart;
                    }).map((e: Record<string, unknown>) => `${e.cas_od}–${e.cas_do} ${e.popis || ""}`);

                    if (conflicts.length === 0) {
                      suggestions.push({ datum: iso, cas_od: toHHMM(startMin), cas_do: toHHMM(endMin), conflicts: [] });
                      break; // jeden slot na den
                    }
                  }
                  current.setDate(current.getDate() + 1);
                }

                const suggestionText = suggestions.length > 0
                  ? suggestions.map((s, i) => `${i + 1}. ${s.datum} ${s.cas_od}–${s.cas_do} (buffer ${buffer_minutes}min před/po)`).join("\n")
                  : "Žádný volný slot nenalezen v daném rozsahu.";

                const ucastniciText = ucastnici.length > 0 ? `\nÚčastníci: ${ucastnici.join(", ")}` : "";
                const result = `Smart Calendar Orchestration výsledek:\n${ucastniciText}\nDélka: ${duration_minutes} min, buffer: ${buffer_minutes} min, preferovaný čas: ${preferred_hours}\n\nDoporučené sloty:\n${suggestionText}\n\nTyp: ${typ}${poznamka ? `, popis: ${poznamka}` : ""}\n\nNabídni uživateli výběr a po potvrzení zavolej calendar_add_event.`;
                toolResults.push({ type: "tool_result", tool_use_id: tool.id, content: result });
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
