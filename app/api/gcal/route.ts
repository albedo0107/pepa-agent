import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function getAccessToken(): Promise<string> {
  const rows = await sql`SELECT refresh_token FROM oauth_tokens WHERE provider = 'google_calendar'`;
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  try {
    const token = await getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(from+"T00:00:00+01:00")}&timeMax=${encodeURIComponent(to+"T23:59:59+01:00")}&singleEvents=true&orderBy=startTime&maxResults=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => r.json());

    const events = (res.items || []).map((e: Record<string, unknown>, i: number) => {
      const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date || "";
      const end = (e.end as Record<string, string>)?.dateTime || (e.end as Record<string, string>)?.date || "";
      const datum = start.slice(0, 10);
      const cas_od = start.length > 10 ? start.slice(11, 16) : "00:00";
      const cas_do = end.length > 10 ? end.slice(11, 16) : "00:00";
      return {
        id: i + 1,
        datum,
        cas_od,
        cas_do,
        typ: "gcal",
        popis: String(e.summary || "Událost"),
        klient_jmeno: (e.description as string) || null,
        obsazeno: true,
        source: "google",
      };
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json([]);
  }
}
