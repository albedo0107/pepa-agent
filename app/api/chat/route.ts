import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

// VPS proxy endpoint
const PEPA_BACKEND = process.env.PEPA_BACKEND_URL || "http://178.104.111.69/pepa-chat";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  try {
    const backendRes = await fetch(`${PEPA_BACKEND}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal: AbortSignal.timeout(290000),
    });

    const data = await backendRes.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 500 });
    }

    // Vrať jako SSE stream (kompatibilní s existujícím ChatApp)
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.response })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: `❌ Backend nedostupný: ${msg}` })}\n\n`));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }
}
