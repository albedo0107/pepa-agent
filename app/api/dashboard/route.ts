import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const [kpiRows, klientiRows, kalendarRows, leadyRows, prodejeRows] = await Promise.all([
    sql`SELECT
      (SELECT COUNT(*) FROM klienti) as klienti,
      (SELECT COUNT(*) FROM nemovitosti WHERE stav = 'k prodeji') as k_prodeji,
      (SELECT COUNT(*) FROM leady WHERE datum >= CURRENT_DATE - 30) as leady_30d,
      (SELECT COALESCE(SUM(cena_prodeje),0) FROM prodeje WHERE datum_prodeje >= DATE_TRUNC('month', CURRENT_DATE)) as obrat_mesic`,
    sql`SELECT jmeno, email, zdroj, datum_akvizice FROM klienti ORDER BY datum_akvizice DESC LIMIT 5`,
    sql`SELECT datum, cas_od, cas_do, popis, klient_jmeno, obsazeno FROM kalendar WHERE datum >= CURRENT_DATE AND datum <= CURRENT_DATE + 7 AND obsazeno = true ORDER BY datum, cas_od LIMIT 8`,
    sql`SELECT TO_CHAR(datum, 'Mon') as mesic, COUNT(*) as pocet FROM leady WHERE datum >= CURRENT_DATE - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', datum), TO_CHAR(datum, 'Mon') ORDER BY DATE_TRUNC('month', datum)`,
    sql`SELECT TO_CHAR(datum_prodeje, 'Mon') as mesic, SUM(cena_prodeje) as obrat FROM prodeje WHERE datum_prodeje >= CURRENT_DATE - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', datum_prodeje), TO_CHAR(datum_prodeje, 'Mon') ORDER BY DATE_TRUNC('month', datum_prodeje)`,
  ]);

  return NextResponse.json({
    kpi: kpiRows[0],
    klienti: klientiRows,
    kalendar: kalendarRows,
    leady: leadyRows,
    prodeje: prodejeRows,
  });
}
