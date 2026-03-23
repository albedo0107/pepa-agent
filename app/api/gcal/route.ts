import { NextRequest, NextResponse } from "next/server";

const GCAL_ICS = "https://calendar.google.com/calendar/ical/alex.belis%40albedoai.cz/public/basic.ics";

function parseICSDate(s: string): { date: string; time: string } {
  // Vezmi jen část za posledním ':'
  const val = s.includes(":") ? s.split(":").pop()! : s;
  const v = val.trim();
  
  if (v.length === 8) {
    // Celý den: YYYYMMDD
    return { date: `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`, time: "00:00" };
  }
  
  const year = v.slice(0, 4);
  const month = v.slice(4, 6);
  const day = v.slice(6, 8);
  const hour = v.slice(9, 11);
  const min = v.slice(11, 13);
  const isUTC = v.endsWith("Z");
  
  if (isUTC) {
    const d = new Date(`${year}-${month}-${day}T${hour}:${min}:00Z`);
    // Prague timezone offset: +1 zima, +2 léto
    const praguOffset = 2; // léto (březen-říjen)
    const local = new Date(d.getTime() + praguOffset * 3600000);
    const ld = local.toISOString();
    return { date: ld.slice(0, 10), time: ld.slice(11, 16) };
  }
  return { date: `${year}-${month}-${day}`, time: `${hour}:${min}` };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const res = await fetch(GCAL_ICS, { cache: "no-store" });
  const ics = await res.text();

  const events = [];
  const blocks = ics.split("BEGIN:VEVENT");
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key: string) => {
      const match = block.match(new RegExp(`${key}[^:]*:(.+)`));
      return match ? match[1].trim() : "";
    };
    
    const dtstart = get("DTSTART");
    const dtend = get("DTEND");
    const summary = get("SUMMARY") || "Událost";
    const description = get("DESCRIPTION");
    const location = get("LOCATION");
    
    if (!dtstart) continue;
    
    const { date, time: cas_od } = parseICSDate(dtstart);
    const { time: cas_do } = parseICSDate(dtend || dtstart);
    
    if (date < from || date > to) continue;
    
    events.push({
      id: i,
      datum: date,
      cas_od,
      cas_do,
      typ: "gcal",
      popis: summary + (location ? ` @ ${location}` : ""),
      klient_jmeno: description || null,
      obsazeno: true,
      source: "google",
    });
  }

  return NextResponse.json(events.sort((a, b) => a.datum.localeCompare(b.datum) || a.cas_od.localeCompare(b.cas_od)));
}
