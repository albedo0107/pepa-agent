import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`
    SELECT id, jmeno, email, stav, priorita, skore,
           COALESCE(posledni_kontakt, datum)::text AS posledni,
           (CURRENT_DATE - COALESCE(posledni_kontakt, datum)) AS dnu_bez_kontaktu
    FROM leady
    WHERE stav NOT IN ('uzavřeno', 'ztraceno', 'prodáno')
      AND CURRENT_DATE - COALESCE(posledni_kontakt, datum) >= 2
    ORDER BY dnu_bez_kontaktu DESC, skore DESC
    LIMIT 10
  `;
  return NextResponse.json(rows);
}
