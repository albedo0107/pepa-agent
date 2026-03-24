import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Chybí code" }, { status: 400 });

  const redirectUri = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/gcal/callback`
    : "http://localhost:3000/api/gcal/callback";

  // Vyměň code za tokeny
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  }).then(r => r.json());

  if (!tokenRes.refresh_token) {
    return NextResponse.json({ error: "Nepodařilo se získat refresh_token", detail: tokenRes }, { status: 400 });
  }

  // Ulož refresh token do DB
  await sql`
    INSERT INTO oauth_tokens (provider, refresh_token, access_token, expires_at)
    VALUES ('google_calendar', ${tokenRes.refresh_token}, ${tokenRes.access_token}, NOW() + INTERVAL '1 hour')
    ON CONFLICT (provider) DO UPDATE SET
      refresh_token = ${tokenRes.refresh_token},
      access_token = ${tokenRes.access_token},
      expires_at = NOW() + INTERVAL '1 hour'
  `;

  return new NextResponse(`
    <html><body style="background:#0f1a1c;color:#10b981;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <div style="font-size:48px">✅</div>
        <h2>Google Calendar připojen!</h2>
        <p style="color:#6b7280">Pepa teď může přidávat události přímo do tvého Google Calendar.</p>
        <a href="/" style="color:#3b82f6">← Zpět na dashboard</a>
      </div>
    </body></html>
  `, { headers: { "Content-Type": "text/html" } });
}
