import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyCVhyrnT9ppoYs6jgcyESsyEqXJTqn4W56-rDAnI5-Ea2BqJEA2FcwiFgSKHebjYvu/exec";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Žádný soubor" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const body = new URLSearchParams();
    body.set("name", file.name);
    body.set("type", file.type || "application/octet-stream");
    body.set("data", base64);

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body,
    });

    const json = await res.json();
    if (!json.ok) return NextResponse.json({ error: "Upload selhal" }, { status: 500 });

    const sizeFmt = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    return NextResponse.json({ name: file.name, sizeFmt, id: json.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
