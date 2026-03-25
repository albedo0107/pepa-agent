import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  // Nadcházející schůzky z kalendáře (dnes + 7 dní)
  const rows = await sql`
    SELECT
      id,
      datum::text AS datum,
      cas_od::text AS cas_od,
      cas_do::text AS cas_do,
      typ,
      COALESCE(klient_jmeno, '') AS klient_jmeno,
      COALESCE(popis, '') AS popis
    FROM kalendar
    WHERE datum >= CURRENT_DATE
      AND datum <= CURRENT_DATE + 7
    ORDER BY datum, cas_od
    LIMIT 15
  `;
  return NextResponse.json(rows);
}
