import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { file_url } = await req.json();

  try {
    // Konvertuj Google Drive URL na download URL
    let downloadUrl = file_url;
    const driveMatch = file_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const res = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });

    const contentType = res.headers.get("content-type") || "";
    const buffer = await res.arrayBuffer();

    // PDF parsing
    if (contentType.includes("pdf") || file_url.includes(".pdf")) {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(Buffer.from(buffer));
      return NextResponse.json({
        ok: true,
        text: data.text.slice(0, 10000),
        pages: data.numpages,
        type: "pdf",
      });
    }

    // Text/CSV/HTML
    const text = new TextDecoder().decode(buffer);
    return NextResponse.json({ ok: true, text: text.slice(0, 10000), type: "text" });

  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
