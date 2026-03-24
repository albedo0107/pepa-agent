# TOOLS.md - Local Notes

> Viz také: [[MEMORY]] | [[AGENTS]] | [[USER]]

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

### Kontakty

- **Kateřina:** `obsilova.katerina@seznam.cz`

### Pepa Agent — Neon DB
- **DATABASE_URL:** `postgresql://neondb_owner:npg_zbYd0Lf9TycJ@ep-delicate-scene-agy0jr3j-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`
- Tabulky: klienti, nemovitosti, leady, prodeje, kalendar, chat_messages
- Použít přes: `/usr/local/opt/postgresql@18/bin/psql "DATABASE_URL" -c "SELECT ..."`

### Sdílená konverzační historie (web + Telegram)
Po každé odpovědi v Telegramu nebo jiném kanálu (ne webchat) VŽDY zavolej:
```bash
curl -s -X POST http://localhost:3000/api/history/append \
  -H "Content-Type: application/json" \
  -d "{\"user\": \"ZPRAVA_UZIVATELE\", \"assistant\": \"MOJE_ODPOVED\"}"
```
Nahraď ZPRAVA_UZIVATELE a MOJE_ODPOVED skutečným textem (bez uvozovek uvnitř — escapuj je).
Tím bude konverzace synchronizovaná mezi webem a Telegramem.

### Pepa WebChat — automatické zpracování dotazů
Když dostanu zprávu s prefixem `[PEPA_WEBCHAT id=XXX]`:
1. Zpracuj dotaz, spusť SQL pokud je potřeba
2. VŽDY na konci zapiš výsledek: `/usr/local/opt/postgresql@18/bin/psql "DATABASE_URL" -c "UPDATE chat_messages SET response = \$txt\$ODPOVĚĎ\$txt\$, status = 'done', updated_at = NOW() WHERE id = 'XXX'"`

### Google Drive — Firemní složka
- **Folder URL:** `https://drive.google.com/drive/folders/1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ`
- **Folder ID:** `1jxnWBwCu0ik18D5sAFy4bE0t7q0aSUtZ`
- Stažení souboru: `https://drive.google.com/uc?export=download&id=FILE_ID`
- Aktuální soubory:
  - `nove_leady.csv` (ID: 17kU39gMHZq5JD5ieFEiAL9o1kQD2cal3) — leady a nemovitosti k importu

### AgentMail

- **API key:** `am_us_5470aed899ab47715f9a150e06e4e579b90eca41997a43da38055f8d2d1c7b9d`
- **Base URL:** `https://api.agentmail.to/v0`
- **Inbox:** `albedo_ai_agnet@agentmail.to`
- **Auth header:** `Authorization: Bearer <api_key>`

---

Add whatever helps you do your job. This is your cheat sheet.
