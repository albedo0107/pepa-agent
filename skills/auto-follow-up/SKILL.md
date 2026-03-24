# SKILL: auto-follow-up

## Co dělá
Každý den ráno zkontroluje Neon DB — všechny leady kde `posledni_kontakt` (nebo `datum` akvizice) je 2+ dní staré a stav není `uzavřeno/ztraceno/prodáno`. Výsledek pošle na **Telegram** i **email**.

## Spuštění (manuální test)
```bash
bash ~/.openclaw/workspace/skills/auto-follow-up/scripts/check-followup.sh
```

## Konfigurace
Všechny proměnné jsou hardcoded ve skriptu `scripts/check-followup.sh`:
- `FOLLOWUP_DAYS=2` — počet dní bez kontaktu
- `DATABASE_URL` — Neon DB connection string
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
- `AGENTMAIL_API_KEY` / `AGENTMAIL_INBOX`
- `"to"` v curl příkazu pro email = cílová adresa

## Cron job
Nastaven přes OpenClaw cron, spouštět každý den ráno (např. 8:00 Po-Pá nebo každý den).

## Závislosti
- `/usr/local/opt/postgresql@18/bin/psql` — PostgreSQL klient
- `curl`, `python3` — dostupné na macOS
- AgentMail inbox musí být aktivní
- Telegram bot musí být spárovaný

## Výstup
```
🔔 Follow-up alert — 5 lead(ů) bez kontaktu 2+ dní:

• Jan Novák (nový) — bez kontaktu: 7 dní (naposledy: 2026-03-17) | jan@email.cz
• Marie Svobodová (kontaktován) — bez kontaktu: 3 dny (naposledy: 2026-03-21)
...

_Doporučuji kontaktovat dnes._
```
