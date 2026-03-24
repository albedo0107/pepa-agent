# SKILL: data-enrichment

## Co dělá
Doplní chybějící data o nemovitosti (rok výstavby, rekonstrukce, stavební úpravy) z heuristiky dle lokality a ceny/m².

## Tool
`enrich_property` v `app/api/chat/route.ts`

## Logika
- cena/m² > 150k → rok výstavby 2015+
- cena/m² > 100k → 2005+
- Vinohrady/Žižkov → 1920
- Holešovice/Karlín → 1960

## DB
Ukládá přes COALESCE — nepřepisuje existující data.
