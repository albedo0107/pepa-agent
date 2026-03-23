import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const rows = await sql`SELECT messages FROM conversations WHERE id = 'main'`;
  return NextResponse.json({ messages: rows[0]?.messages || [] });
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  await sql`
    INSERT INTO conversations (id, messages, updated_at)
    VALUES ('main', ${JSON.stringify(messages)}, NOW())
    ON CONFLICT (id) DO UPDATE SET messages = ${JSON.stringify(messages)}, updated_at = NOW()
  `;
  return NextResponse.json({ ok: true });
}
