import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Prázdná zpráva" }, { status: 400 });
  }

  const id = randomUUID();

  // Uložit zprávu do DB se statusem pending
  await sql`
    INSERT INTO chat_messages (id, message, status)
    VALUES (${id}, ${message}, 'pending')
  `;

  // Zavolat OpenClaw webhook s ID a dotazem
  const OPENCLAW_URL = process.env.OPENCLAW_URL!;
  const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN!;
  const DATABASE_URL = process.env.DATABASE_URL!;

  const prompt = `[PEPA BACK OFFICE AGENT - ID: ${id}]
Jsi Pepa, AI back office operations agent realitní firmy. Máš přístup k firemní databázi přes exec tool.

Databáze (Neon DB PostgreSQL):
Connection: ${DATABASE_URL}

Tabulky:
- klienti (id, jmeno, email, telefon, zdroj, datum_akvizice)
- nemovitosti (id, nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy)
- leady (id, jmeno, email, zdroj, datum, nemovitost_id, stav)  
- prodeje (id, nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc)
- kalendar (id, datum, cas_od, cas_do, typ, popis, obsazeno)

INSTRUKCE:
1. Zpracuj dotaz uživatele: "${message}"
2. Pokud potřebuješ data, spusť SQL dotaz přes: psql "${DATABASE_URL}" -c "SQL_DOTAZ"
3. Formuluj odpověď v češtině, stručně a přesně
4. Na konci MUSÍŠ zavolat: curl -s -X PATCH "http://localhost:18789/hooks/wake" -H "Authorization: Bearer pepa-hooks-secret-2026" ... NE. Místo toho ulož odpověď do DB:

psql "${DATABASE_URL}" -c "UPDATE chat_messages SET response = '...tvoje odpověď...', status = 'done', updated_at = NOW() WHERE id = '${id}'"

DŮLEŽITÉ: Na konci své odpovědi VŽDY ulož výsledek do DB pomocí psql příkazu výše!`;

  await fetch(`${OPENCLAW_URL}/hooks/agent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: prompt,
      name: "Pepa WebChat",
      deliver: false,
      timeoutSeconds: 120,
    }),
  });

  return NextResponse.json({ id });
}
