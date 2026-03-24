# SKILL: competitive-intelligence

## Co dělá
Analyzuje konkurenční nabídky na trhu pro danou lokalitu a typ nemovitosti pomocí Brave Search API.

## Tool
`competitive_intelligence` v `app/api/chat/route.ts`

## Parametry
- `lokalita` — Praha čtvrť nebo město
- `typ` — byt, dům, komerční
- `dispozice` — např. 3+1
- `nase_cena` — naše cena k porovnání

## Výstup
- Živé výsledky ze Sreality/Bezrealitky (Brave Search)
- Naše nabídky v lokalitě s cenou/m²
- Přímé linky na konkurenční vyhledávání

## Závislosti
- `BRAVE_API_KEY` env var (nastaven na Vercelu)
