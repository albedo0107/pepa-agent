import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Žádný soubor" }, { status: 400 });

    const sizeFmt = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    const isText = file.type.includes("text") || file.type.includes("csv") ||
      file.type.includes("json") || file.name.endsWith(".csv") ||
      file.name.endsWith(".txt") || file.name.endsWith(".json") ||
      file.name.endsWith(".md");

    let obsah: string | null = null;
    let obsah_base64: string | null = null;

    if (isText && file.size < 1024 * 1024) {
      obsah = await file.text();
    } else {
      // Binární soubory — uložit jako base64
      const buffer = await file.arrayBuffer();
      obsah_base64 = Buffer.from(buffer).toString("base64");
    }

    // Ulož do DB
    const result = await sql`
      INSERT INTO soubory (nazev, typ, velikost, obsah, obsah_base64)
      VALUES (${file.name}, ${file.type}, ${file.size}, ${obsah}, ${obsah_base64})
      RETURNING id, nahrano_at
    `;

    return NextResponse.json({
      id: result[0].id,
      name: file.name,
      sizeFmt,
      type: file.type,
      saved: true,
      content: obsah ? (obsah.length > 10000 ? obsah.slice(0, 10000) + "\n...(zkráceno)" : obsah) : null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
