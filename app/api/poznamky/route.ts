import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT * FROM dashboard_poznamky ORDER BY created_at DESC LIMIT 20`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { typ, nadpis, obsah, zdroj } = await req.json();
  const row = await sql`
    INSERT INTO dashboard_poznamky (typ, nadpis, obsah, zdroj)
    VALUES (${typ || "info"}, ${nadpis}, ${obsah || null}, ${zdroj || null})
    RETURNING *
  `;
  return NextResponse.json(row[0]);
}
