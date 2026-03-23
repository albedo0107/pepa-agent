import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

function toISODateStr(date: string | Date): string {
  if (typeof date === "string") return date.slice(0, 10);
  return date.toISOString().split("T")[0];
}

function toTimeStr(time: string | Date): string {
  if (typeof time === "string") return time.slice(0, 5);
  return time.toISOString().slice(11, 16);
}

function toICSDate(date: string | Date, time: string | Date) {
  const d = toISODateStr(date).replace(/-/g, "");
  const t = toTimeStr(time).replace(":", "");
  return `${d}T${t}00`;
}

export async function GET() {
  const events = await sql`
    SELECT datum, cas_od, cas_do, typ, popis, klient_jmeno
    FROM kalendar
    WHERE obsazeno = true AND datum >= CURRENT_DATE
    ORDER BY datum, cas_od
  `;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pepa Back Office Agent//CZ",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pepa — Firemní kalendář",
    "X-WR-TIMEZONE:Europe/Prague",
  ];

  for (const e of events) {
    const uid = `${toISODateStr(e.datum)}-${toTimeStr(e.cas_od)}-${Math.random().toString(36).slice(2)}@pepa-agent`;
    const summary = e.popis || e.typ;
    const desc = e.klient_jmeno ? `Klient: ${e.klient_jmeno}` : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTART:${toICSDate(e.datum, e.cas_od)}`,
      `DTEND:${toICSDate(e.datum, e.cas_do)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `CATEGORIES:${e.typ}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=pepa-kalendar.ics",
    },
  });
}
