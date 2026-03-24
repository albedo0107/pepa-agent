# SKILL: excel-handler

## Co dělá
Čtení a vytváření Excel (XLSX) souborů.

## Čtení
- Drag & drop XLSX do chatu → Pepa přečte všechny listy přes `read_drive_document` tool
- Podporuje: XLSX, XLS, CSV, DOCX, PDF

## Vytváření
- Tool `create_document` s `format: "xlsx"`
- Endpoint: `app/api/generate/route.ts`
- Vstup: `data.headers` + `data.rows` → tabulkový Excel
- Nebo `content` → textový Excel

## Závislosti
- npm balíček `xlsx` (^0.18.5)
