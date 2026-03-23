import { NextRequest, NextResponse } from "next/server";

async function extractText(buffer: ArrayBuffer, contentType: string, url: string): Promise<string> {
  // PDF
  if (contentType.includes("pdf") || url.includes(".pdf")) {
    try {
      const { extractText } = await import("unpdf");
      const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
      if (text && text.length > 50) return text;
    } catch {}
    // Fallback: extrahuj čitelný text z raw PDF
    const raw = new TextDecoder("latin1").decode(buffer);
    const matches = raw.match(/\(([^\)]{3,200})\)/g) || [];
    const text = matches
      .map(m => m.slice(1, -1))
      .filter(t => /[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(t))
      .join(" ");
    if (text.length > 100) return text;
    throw new Error("PDF nelze přečíst. Doporučujeme použít Google Docs nebo DOCX formát.");
  }

  // Word DOCX
  if (contentType.includes("wordprocessingml") || url.includes(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
    return result.value;
  }

  // Excel XLSX
  if (contentType.includes("spreadsheetml") || url.includes(".xlsx") || url.includes(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(Buffer.from(buffer), { type: "buffer" });
    let text = "";
    wb.SheetNames.forEach((name: string) => {
      const ws = wb.Sheets[name];
      text += `=== ${name} ===\n`;
      text += XLSX.utils.sheet_to_csv(ws) + "\n";
    });
    return text;
  }

  // CSV / TXT / HTML
  const text = new TextDecoder().decode(buffer);
  if (contentType.includes("html") || text.trimStart().startsWith("<!")) {
    return text
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
      .replace(/\s{3,}/g, "\n").trim();
  }
  return text;
}

export async function POST(req: NextRequest) {
  const { file_url } = await req.json();

  try {
    let downloadUrl = file_url;
    const driveFileMatch = file_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileMatch[1]}`;
    } else if (file_url.includes("docs.google.com/document")) {
      const id = file_url.match(/\/d\/([^/]+)/)?.[1];
      if (id) downloadUrl = `https://docs.google.com/document/d/${id}/export?format=txt`;
    } else if (file_url.includes("docs.google.com/spreadsheets")) {
      const id = file_url.match(/\/d\/([^/]+)/)?.[1];
      if (id) downloadUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    }

    const res = await fetch(downloadUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      redirect: "follow",
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    const buffer = await res.arrayBuffer();
    const text = await extractText(buffer, contentType, file_url);

    return NextResponse.json({
      ok: true,
      text: text.slice(0, 12000),
      length: text.length,
      type: contentType.split(";")[0].trim(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
