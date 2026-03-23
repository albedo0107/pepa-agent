import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// POST { user: "zpráva uživatele", assistant: "moje odpověď" }
export async function POST(req: NextRequest) {
  const { user, assistant } = await req.json();
  if (!user || !assistant) return NextResponse.json({ error: "missing fields" }, { status: 400 });

  await sql`
    INSERT INTO conversations (id, messages, updated_at)
    VALUES ('main', ${JSON.stringify([
      { role: "user", content: user },
      { role: "assistant", content: assistant }
    ])}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      messages = conversations.messages || ${JSON.stringify([
        { role: "user", content: user },
        { role: "assistant", content: assistant }
      ])}::jsonb,
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
