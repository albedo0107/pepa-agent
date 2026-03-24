import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function getAccessToken(): Promise<string> {
  const rows = await sql`SELECT * FROM oauth_tokens WHERE provider = 'google_calendar'`;
  if (!rows.length) throw new Error("Google Calendar není připojen. Jdi na /api/gcal/auth");

  const token = rows[0];
  // Obnov token pokud expiroval
  if (!token.expires_at || new Date(token.expires_at) < new Date(Date.now() + 60000)) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: token.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    }).then(r => r.json());

    await sql`UPDATE oauth_tokens SET access_token = ${res.access_token}, expires_at = NOW() + INTERVAL '1 hour' WHERE provider = 'google_calendar'`;
    return res.access_token;
  }
  return token.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const { datum, cas_od, cas_do, popis, klient_jmeno, mistnost } = await req.json();
    const accessToken = await getAccessToken();

    const start = new Date(`${datum}T${cas_od}:00+01:00`).toISOString();
    const end = new Date(`${datum}T${cas_do}:00+01:00`).toISOString();

    const event = {
      summary: popis,
      description: klient_jmeno ? `Klient: ${klient_jmeno}` : undefined,
      location: mistnost || undefined,
      start: { dateTime: start, timeZone: "Europe/Prague" },
      end: { dateTime: end, timeZone: "Europe/Prague" },
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }).then(r => r.json());

    if (res.id) {
      return NextResponse.json({ ok: true, id: res.id, link: res.htmlLink });
    }
    return NextResponse.json({ error: res.error?.message || "Chyba" }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
