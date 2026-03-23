import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date().toISOString().split("T")[0];
  const to = searchParams.get("to") || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const rows = await sql`
    SELECT id, datum, cas_od, cas_do, typ, popis, klient_jmeno, obsazeno
    FROM kalendar
    WHERE datum >= ${from} AND datum <= ${to}
    ORDER BY datum, cas_od
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { datum, cas_od, cas_do, typ, popis, klient_jmeno } = await req.json();

  // Zkontroluj konflikt
  const conflict = await sql`
    SELECT id FROM kalendar
    WHERE datum = ${datum} AND obsazeno = true
    AND cas_od < ${cas_do} AND cas_do > ${cas_od}
  `;
  if (conflict.length > 0) {
    return NextResponse.json({ error: "Časový konflikt — slot je obsazený" }, { status: 409 });
  }

  const result = await sql`
    INSERT INTO kalendar (datum, cas_od, cas_do, typ, popis, klient_jmeno, obsazeno)
    VALUES (${datum}, ${cas_od}, ${cas_do}, ${typ || "schůzka"}, ${popis}, ${klient_jmeno || null}, true)
    RETURNING id
  `;
  return NextResponse.json({ ok: true, id: result[0].id });
}
