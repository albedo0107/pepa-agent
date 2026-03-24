# SKILL: lead-scoring

## Co dělá
Automaticky vyhodnotí každý nový lead — přiřadí skóre 0-100, prioritu (vysoká/střední/nízká) a doporučenou akci.

## Pravidla scoringu
- Zdroj "doporučení" = +30 bodů
- Zdroj "web" = +20 bodů
- Zdroj "sreality/bezrealitky" = +10 bodů
- Budget nad 10M = +20 bodů
- Zájem o konkrétní nemovitost = +15 bodů
- Priorita vysoká (75-100): "Zavolat do 2 hodin"
- Priorita střední (50-74): "Kontaktovat do 24 hodin"
- Priorita nízká (0-49): "Sledovat, email do týdne"

## Tool
`score_lead` v `app/api/chat/route.ts` — volá se automaticky při importu leadu.

## DB
Ukládá do `leady.skore`, `leady.priorita`, `leady.doporucena_akce`.
