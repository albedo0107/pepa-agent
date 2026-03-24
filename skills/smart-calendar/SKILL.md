# SKILL: smart-calendar-orchestration

## Co dělá
Najde optimální termín schůzky pro více účastníků s respektováním buffer časů a kontrolou konfliktů.

## Parametry
- `ucastnici` — jména účastníků
- `from/to` — rozsah hledání
- `duration_minutes` — délka schůzky (default 60)
- `buffer_minutes` — buffer před/po (default 15)
- `preferred_hours` — preferovaný čas (default "9:00-17:00")

## Tool
`smart_calendar_orchestrate` v `app/api/chat/route.ts`

## Výstup
5 nejlepších volných slotů → uživatel vybere → `calendar_add_event` přidá do DB.
