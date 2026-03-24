import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Žádný soubor" }, { status: 400 });

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN není nastaven" }, { status: 500 });
    }

    const blob = await put(`pepa-uploads/${Date.now()}-${file.name}`, file, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ url: blob.url, name: file.name, size: file.size, type: file.type });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Upload error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
