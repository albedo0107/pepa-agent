import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

// Polling endpoint - čekáme na výsledek z OpenClaw session
// OpenClaw runs /hooks/agent async - musíme pollovat session pro odpověď
export async function GET(
  req: NextRequest,
  { params }: { params: { runId: string } }
) {
  const { runId } = params;

  // Pro demo: čteme poslední odpověď z OpenClaw session přes gateway API
  const OPENCLAW_URL = process.env.OPENCLAW_URL!;
  const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN!;

  const response = await fetch(
    `${OPENCLAW_URL}/api/sessions/hook:pepa-webchat/messages?limit=1`,
    {
      headers: {
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    return NextResponse.json({ status: "pending" });
  }

  const data = await response.json();
  const messages = data.messages || [];
  const lastAssistant = messages.find((m: { role: string }) => m.role === "assistant");

  if (!lastAssistant) {
    return NextResponse.json({ status: "pending" });
  }

  return NextResponse.json({
    status: "done",
    text: lastAssistant.content,
    runId,
  });
}
