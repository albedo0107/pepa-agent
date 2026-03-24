# SKILL: email-reader

## Co dělá
Čtení emailů přes AgentMail API, zpracování požadavků a schůzek z emailů, uložení do DB.

## AgentMail
- **Inbox:** `albedo_ai_agnet@agentmail.to`
- **API:** `https://api.agentmail.to/v0`
- **Auth:** `Authorization: Bearer am_us_5470aed899ab47715f9a150e06e4e579b90eca41997a43da38055f8d2d1c7b9d`

## Čtení emailů
```bash
curl -H "Authorization: Bearer <key>" https://api.agentmail.to/v0/inboxes/albedo_ai_agnet@agentmail.to/messages
```

## Workflow
1. Pepa přečte emaily z inboxu
2. Detekuje požadavky (schůzky, leady, dotazy)
3. Uloží relevatní data do DB (kalendar, leady)
4. Odpoví nebo notifikuje

## Odeslání emailu
```bash
curl -X POST https://api.agentmail.to/v0/inboxes/albedo_ai_agnet@agentmail.to/messages/send \
  -H "Authorization: Bearer <key>" \
  -H "Content-Type: application/json" \
  -d '{"to": "...", "subject": "...", "text": "..."}'
```

## TODO
- Implementovat jako tool v chat/route.ts: `read_emails`, `process_email`
- Cron job pro automatické čtení emailů každou hodinu
