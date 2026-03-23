// Pepa Worker — čte pending zprávy z DB, volá OpenClaw, zapisuje odpovědi
// Spustit: npx tsx scripts/worker.ts

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://localhost:18789";
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN!;

const DB_SCHEMA = `
Tabulky v Neon DB (PostgreSQL):
- klienti (id, jmeno, email, telefon, zdroj, datum_akvizice)
- nemovitosti (id, nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy)
- leady (id, jmeno, email, zdroj, datum, nemovitost_id, stav)
- prodeje (id, nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc)
- kalendar (id, datum, cas_od, cas_do, typ, popis, obsazeno)
DATABASE_URL: ${process.env.DATABASE_URL}
`;

async function processMessage(id: string, message: string) {
  console.log(`[${new Date().toISOString()}] Zpracovávám: ${id} — "${message.slice(0, 60)}"`);

  const prompt = `Jsi Pepa, AI back office agent realitní firmy. Odpověz na dotaz níže v češtině.

${DB_SCHEMA}

Pro SQL dotazy použij: /usr/local/opt/postgresql@18/bin/psql "$DATABASE_URL" -c "SQL"

Dotaz: ${message}

Odpověz stručně a přesně. Pokud potřebuješ data z DB, spusť SQL.`;

  const res = await fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: prompt,
      name: "pepa-worker",
      deliver: false,
      timeoutSeconds: 60,
    }),
  });

  const { runId } = await res.json();

  // Čekej na výsledek z hook sessiony
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    
    // Čti poslední zprávu z hook session
    const sessionPath = `${process.env.HOME}/.openclaw/agents/main/sessions`;
    try {
      const { execSync } = await import("child_process");
      const sessions = JSON.parse(
        execSync(`cat ${sessionPath}/sessions.json`).toString()
      );
      const hookSessionId = sessions["agent:main:hook:pepa-webchat"]?.sessionId;
      
      if (hookSessionId) {
        const lines = execSync(`cat ${sessionPath}/${hookSessionId}.jsonl`).toString().split("\n");
        const lastAssistant = lines.reverse().find((l) => {
          try {
            const o = JSON.parse(l);
            return o.type === "message" && o.message?.role === "assistant";
          } catch {
            return false;
          }
        });

        if (lastAssistant) {
          const o = JSON.parse(lastAssistant);
          const text = o.message.content
            .filter((c: { type: string }) => c.type === "text")
            .map((c: { text: string }) => c.text)
            .join("");

          if (text && !text.includes("HEARTBEAT_OK")) {
            await sql`UPDATE chat_messages SET response = ${text}, status = 'done', updated_at = NOW() WHERE id = ${id}`;
            console.log(`✅ Hotovo: ${id}`);
            return;
          }
        }
      }
    } catch {}
  }

  await sql`UPDATE chat_messages SET response = 'Timeout — agent neodpověděl včas.', status = 'error', updated_at = NOW() WHERE id = ${id}`;
}

async function run() {
  console.log("🚀 Pepa Worker spuštěn");
  
  while (true) {
    const pending = await sql`
      SELECT id, message FROM chat_messages 
      WHERE status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT 1
    `;

    if (pending.length > 0) {
      const { id, message } = pending[0];
      await processMessage(id, message);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

run().catch(console.error);
