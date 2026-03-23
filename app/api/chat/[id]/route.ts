import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const rows = await sql`
    SELECT id, message, response, status FROM chat_messages WHERE id = ${id}
  `;

  if (!rows.length) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    status: row.status,
    message: row.message,
    response: row.response,
  });
}
