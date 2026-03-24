import { NextRequest, NextResponse } from "next/server";

const VPS_URL = process.env.OPENCLAW_URL || "http://178.104.111.69";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Žádný soubor" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const res = await fetch(`${VPS_URL}:4567/upload`, {
      method: "POST",
      headers: { "X-Filename": encodeURIComponent(file.name), "Content-Type": file.type || "application/octet-stream" },
      body: buffer,
    });

    const json = await res.json();
    if (!json.ok) return NextResponse.json({ error: "Upload selhal" }, { status: 500 });

    const sizeFmt = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    return NextResponse.json({ name: file.name, sizeFmt, saved: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${VPS_URL}:4567/files`);
    const files = await res.json();
    return NextResponse.json(files);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
