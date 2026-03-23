import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { format, title, content, data, slides } = await req.json();

  if (format === "docx") {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } = await import("docx");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [
      new Paragraph({ text: title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: new Date().toLocaleDateString("cs-CZ"), alignment: AlignmentType.CENTER }),
      new Paragraph({ text: "" }),
    ];

    for (const line of content.split("\n")) {
      const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").trim();
      if (!clean) { children.push(new Paragraph("")); continue; }
      if (line.startsWith("## ")) {
        children.push(new Paragraph({ text: clean.replace("## ", ""), heading: HeadingLevel.HEADING_2 }));
      } else if (line.startsWith("# ")) {
        children.push(new Paragraph({ text: clean.replace("# ", ""), heading: HeadingLevel.HEADING_1 }));
      } else if (line.startsWith("- ") || line.startsWith("• ")) {
        children.push(new Paragraph({ text: clean.replace(/^[-•]\s*/, ""), bullet: { level: 0 } }));
      } else {
        children.push(new Paragraph({ children: [new TextRun(clean)] }));
      }
    }

    if (data?.rows?.length > 0) {
      children.push(new Paragraph(""));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: data.headers.map((h: string) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) }),
          ...data.rows.map((row: string[]) => new TableRow({ children: row.map((cell: string) => new TableCell({ children: [new Paragraph(String(cell))] })) })),
        ],
      }));
    }

    const doc = new Document({ sections: [{ children }] });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.docx"`,
      },
    });
  }

  if (format === "pptx") {
    const pptxgen = (await import("pptxgenjs")).default;
    const prs = new pptxgen();
    prs.layout = "LAYOUT_16x9";

    const BLUE = "3b82f6";
    const DARK = "0f172a";
    const LIGHT = "e2e8f0";
    const GRAY = "94a3b8";

    // Slidů pole — buď z `slides` parametru nebo z content
    const slideList = slides || [{ title, content, table: data }];

    for (let idx = 0; idx < slideList.length; idx++) {
      const s = slideList[idx];
      const slide = prs.addSlide();
      slide.background = { color: idx === 0 ? "1e293b" : DARK };

      if (idx === 0) {
        // Titulní slide
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 2.5, w: "100%", h: 0.08, fill: { color: BLUE } });
        slide.addText(s.title || title, { x: 0.5, y: 1.2, w: 9, h: 1.5, fontSize: 40, bold: true, color: "ffffff", align: "center" });
        slide.addText(new Date().toLocaleDateString("cs-CZ"), { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 16, color: GRAY, align: "center" });
        slide.addText("Pepa — Back Office Agent", { x: 0.5, y: 5.0, w: 9, h: 0.5, fontSize: 14, color: BLUE, align: "center" });
      } else {
        // Obsahový slide
        slide.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 1.0, fill: { color: "1e293b" } });
        slide.addText(s.title || `Slide ${idx + 1}`, { x: 0.3, y: 0.15, w: 9, h: 0.7, fontSize: 24, bold: true, color: BLUE });

        // Tabulka
        if (s.table?.rows?.length > 0) {
          const tableData = [
            s.table.headers.map((h: string) => ({ text: h, options: { bold: true, color: "ffffff", fill: { color: BLUE } } })),
            ...s.table.rows.map((row: string[]) => row.map((cell: string, ci: number) => ({
              text: String(cell),
              options: { color: LIGHT, fill: { color: ci % 2 === 0 ? "1e293b" : "0f172a" } }
            }))),
          ];
          slide.addTable(tableData, { x: 0.3, y: 1.2, w: 9.4, h: 4.5, fontSize: 12, border: { type: "solid", color: "334155", pt: 0.5 } });
        } else if (s.content) {
          // Textový obsah
          const lines = s.content.split("\n").filter((l: string) => l.trim()).slice(0, 7);
          lines.forEach((line: string, i: number) => {
            const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^[-•#]\s*/, "");
            const isBullet = line.startsWith("-") || line.startsWith("•");
            slide.addText((isBullet ? "▸  " : "") + clean, {
              x: 0.5, y: 1.2 + i * 0.65, w: 9, h: 0.6,
              fontSize: isBullet ? 15 : 17,
              bold: !isBullet && line.startsWith("#"),
              color: isBullet ? LIGHT : "ffffff",
            });
          });
        }

        // Číslo slide
        slide.addText(`${idx}/${slideList.length - 1}`, { x: 9.0, y: 5.1, w: 0.8, h: 0.4, fontSize: 11, color: GRAY, align: "right" });
      }
    }

    const buffer = await prs.write({ outputType: "nodebuffer" }) as Buffer;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(title)}.pptx"`,
      },
    });
  }

  if (format === "pdf") {
    const rows = data?.rows || [];
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @page { margin: 20mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 900px; margin: 0 auto; }
      h1 { color: #3b82f6; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; font-size: 24px; }
      h2 { color: #1e40af; margin-top: 24px; font-size: 18px; }
      ul, ol { line-height: 2; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; font-size: 12px; }
      th { background: #3b82f6; color: white; padding: 8px; text-align: left; }
      td { border: 1px solid #e2e8f0; padding: 6px; }
      tr:nth-child(even) td { background: #f8fafc; }
      .meta { color: #94a3b8; font-size: 12px; margin-bottom: 20px; }
      .print-btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-bottom: 20px; }
      @media print { .print-btn { display: none; } }
    </style>
    </head><body>
    <button class="print-btn" onclick="window.print()">🖨️ Tisknout / Uložit jako PDF</button>
    <h1>${title}</h1>
    <div class="meta">Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} | Pepa — Back Office Agent</div>
    <div>${content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/^## (.*)/gm, "<h2>$1</h2>").replace(/^- (.*)/gm, "<li>$1</li>").replace(/\n/g, "<br>")}</div>
    ${rows.length > 0 ? `<table><tr>${data.headers.map((h: string) => `<th>${h}</th>`).join("")}</tr>${rows.map((r: string[]) => `<tr>${r.map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("")}</table>` : ""}
    </body></html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${encodeURIComponent(title)}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "Nepodporovaný formát" }, { status: 400 });
}
