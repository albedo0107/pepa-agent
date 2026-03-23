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
    const text = await res.text();

    // HTML → čistý text
    if (contentType.includes("html") || text.trimStart().startsWith("<!")) {
      const clean = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ").replace(/&quot;/g, '"')
        .replace(/\s{3,}/g, "\n")
        .trim();
      return NextResponse.json({ ok: true, text: clean.slice(0, 10000), type: "html" });
    }

    // PDF — použij Google Docs viewer pro extrakci textu
    if (contentType.includes("pdf") || file_url.includes(".pdf")) {
      const driveMatch = file_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        // Google Docs viewer vrátí HTML s textem
        const viewerUrl = `https://docs.google.com/viewer?embedded=true&url=https://drive.google.com/uc?export=download%26id=${driveMatch[1]}`;
        const vRes = await fetch(viewerUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const vHtml = await vRes.text();
        const clean = vHtml.replace(/<[^>]+>/g, " ").replace(/\s{3,}/g, "\n").trim();
        if (clean.length > 100) {
          return NextResponse.json({ ok: true, text: clean.slice(0, 10000), type: "pdf-via-viewer" });
        }
      }
      return NextResponse.json({ ok: false, error: "PDF nelze přečíst. Nahraj dokument jako Google Doc nebo HTML." });
    }

    return NextResponse.json({ ok: true, text: text.slice(0, 10000), type: "text" });

  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
