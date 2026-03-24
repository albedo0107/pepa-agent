import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "Žádný soubor" }, { status: 400 });

    const sizeFmt = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    // Přečti obsah souboru přímo
    const isText = file.type.includes("text") || file.type.includes("csv") ||
      file.type.includes("json") || file.name.endsWith(".csv") ||
      file.name.endsWith(".txt") || file.name.endsWith(".json");

    let content: string | null = null;
    if (isText && file.size < 500 * 1024) {
      content = await file.text();
      // Limit na 10k znaků
      if (content.length > 10000) content = content.slice(0, 10000) + "\n... (zkráceno)";
    }

    return NextResponse.json({
      name: file.name,
      size: file.size,
      sizeFmt,
      type: file.type,
      content,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
