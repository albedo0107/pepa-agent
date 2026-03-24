import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function toICSDate(datum: string, cas: string): string {
  const dt = new Date(`${datum}T${cas}:00+01:00`);
  return dt.toISOString().replace(/[-:]/g, "").replace(".000", "");
}

export async function GET() {
  const events = await sql`
    SELECT datum::text, cas_od, cas_do, popis, klient_jmeno, typ, mistnost
    FROM kalendar
    WHERE obsazeno = true AND datum >= CURRENT_DATE
    ORDER BY datum, cas_od
  `;

  const uid = () => Math.random().toString(36).slice(2) + "@pepa-agent";

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pepa Back Office Agent//CS",
    "CALNAME:Pepa — Back Office",
    "X-WR-CALNAME:Pepa — Back Office",
  ].join("\r\n");

  for (const e of events) {
    const start = toICSDate(e.datum, String(e.cas_od).slice(0, 5));
    const end = toICSDate(e.datum, String(e.cas_do).slice(0, 5));
    const desc = [e.klient_jmeno ? `Klient: ${e.klient_jmeno}` : "", e.mistnost ? `Místnost: ${e.mistnost}` : ""].filter(Boolean).join("\\n");
    ics += "\r\nBEGIN:VEVENT\r\n";
    ics += `UID:${uid()}\r\n`;
    ics += `DTSTART:${start}\r\n`;
    ics += `DTEND:${end}\r\n`;
    ics += `SUMMARY:${e.popis}\r\n`;
    if (desc) ics += `DESCRIPTION:${desc}\r\n`;
    if (e.mistnost) ics += `LOCATION:${e.mistnost}\r\n`;
    ics += "END:VEVENT";
  }

  ics += "\r\nEND:VCALENDAR";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="pepa-kalendar.ics"',
    },
  });
}
