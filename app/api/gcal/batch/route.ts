import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

const sql = neon(process.env.DATABASE_URL!);

async function getAccessToken(): Promise<string> {
  const rows = await sql`SELECT * FROM oauth_tokens WHERE provider = 'google_calendar'`;
  if (!rows.length) throw new Error("Google Calendar není připojen");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: rows[0].refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  }).then(r => r.json());
  return res.access_token;
}

type EventInput = {
  datum: string;
  cas_od: string;
  cas_do: string;
  popis: string;
  klient_jmeno?: string;
  mistnost?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { events } = await req.json() as { events: EventInput[] };
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Chybí pole events" }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    const results: { ok: boolean; popis: string; id?: string; error?: string }[] = [];

    // Google Calendar nemá batch API v3 — posíláme sekvenčně ale rychle
    for (const ev of events) {
      try {
        const start = new Date(`${ev.datum}T${ev.cas_od}:00+01:00`).toISOString();
        const end   = new Date(`${ev.datum}T${ev.cas_do}:00+01:00`).toISOString();

        const body = {
          summary: ev.popis,
          description: ev.klient_jmeno ? `Klient: ${ev.klient_jmeno}` : undefined,
          location: ev.mistnost || undefined,
          start: { dateTime: start, timeZone: "Europe/Prague" },
          end:   { dateTime: end,   timeZone: "Europe/Prague" },
        };

        const res = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        ).then(r => r.json());

        if (res.id) {
          results.push({ ok: true, popis: ev.popis, id: res.id });
          // Ulož i do DB kalendar
          await sql`
            INSERT INTO kalendar (datum, cas_od, cas_do, typ, popis, klient_jmeno, mistnost, gcal_event_id)
            VALUES (${ev.datum}, ${ev.cas_od}, ${ev.cas_do}, 'schuze', ${ev.popis}, ${ev.klient_jmeno || null}, ${ev.mistnost || null}, ${res.id})
            ON CONFLICT DO NOTHING
          `;
        } else {
          results.push({ ok: false, popis: ev.popis, error: res.error?.message || "Chyba" });
        }
      } catch (e) {
        results.push({ ok: false, popis: ev.popis, error: String(e) });
      }
    }

    const ok = results.filter(r => r.ok).length;
    const fail = results.filter(r => !r.ok).length;
    return NextResponse.json({ ok: true, added: ok, failed: fail, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
