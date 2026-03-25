import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`
    SELECT id, jmeno, email, stav, priorita,
           COALESCE(posledni_kontakt, datum)::text AS posledni,
           (CURRENT_DATE - COALESCE(posledni_kontakt, datum))::int AS dnu_bez_kontaktu
    FROM leady
    WHERE stav NOT IN ('uzavřeno', 'ztraceno', 'prodáno', 'zamítnut', 'konvertován')
      AND (CURRENT_DATE - COALESCE(posledni_kontakt, datum)) >= 4
    ORDER BY dnu_bez_kontaktu DESC
    LIMIT 8
  `;
  return NextResponse.json(rows, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
