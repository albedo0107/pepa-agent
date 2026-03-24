#!/bin/bash
# auto-follow-up — denní kontrola leadů bez follow-upu 2+ dny
# Spouštět přes cron každý den ráno

DATABASE_URL="postgresql://neondb_owner:npg_zbYd0Lf9TycJ@ep-delicate-scene-agy0jr3j-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
PSQL="/usr/local/opt/postgresql@18/bin/psql"
AGENTMAIL_API_KEY="am_us_5470aed899ab47715f9a150e06e4e579b90eca41997a43da38055f8d2d1c7b9d"
AGENTMAIL_INBOX="albedo_ai_agnet@agentmail.to"
TELEGRAM_BOT_TOKEN="8715412047:AAFq7VwdFUO0Nfiv_RhGtgA_K8iU0LGS-9pY"
TELEGRAM_CHAT_ID="6157958599"
FOLLOWUP_DAYS=2

# Načti leady bez kontaktu 2+ dny (stav != 'uzavřeno' a != 'ztraceno')
LEADS=$($PSQL "$DATABASE_URL" -t -A -F'|' -c "
  SELECT id, jmeno, email, stav, 
         COALESCE(posledni_kontakt::text, datum::text) AS posledni,
         CURRENT_DATE - COALESCE(posledni_kontakt, datum) AS dnů_bez_kontaktu
  FROM leady
  WHERE stav NOT IN ('uzavřeno', 'ztraceno', 'prodáno')
    AND CURRENT_DATE - COALESCE(posledni_kontakt, datum) >= $FOLLOWUP_DAYS
  ORDER BY dnů_bez_kontaktu DESC
  LIMIT 20;
")

if [ -z "$LEADS" ]; then
  echo "Žádné leady bez follow-upu. ✅"
  exit 0
fi

# Sestavení zprávy
COUNT=$(echo "$LEADS" | grep -c '|')
TELEGRAM_MSG="🔔 *Follow-up alert* — $COUNT lead(ů) bez kontaktu 2+ dní:"$'\n\n'

EMAIL_BODY="Pepa — denní follow-up report"$'\n'"$(date '+%d.%m.%Y')"$'\n\n'
EMAIL_BODY+="Leady bez kontaktu 2+ dní:"$'\n\n'

while IFS='|' read -r id jmeno email stav posledni dny; do
  [ -z "$id" ] && continue
  LINE="• *$jmeno* ($stav) — bez kontaktu: ${dny} dní (naposledy: $posledni)"
  [ -n "$email" ] && LINE+=" | $email"
  TELEGRAM_MSG+="$LINE"$'\n'
  EMAIL_BODY+="- $jmeno ($stav) — $dny dní bez kontaktu, naposledy: $posledni"
  [ -n "$email" ] && EMAIL_BODY+=" | $email"
  EMAIL_BODY+=$'\n'
done <<< "$LEADS"

TELEGRAM_MSG+=$'\n'"_Doporučuji kontaktovat dnes._"
EMAIL_BODY+=$'\n'"Doporučuji kontaktovat dnes."

# Odeslání na Telegram
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"$TELEGRAM_CHAT_ID\",
    \"text\": $(echo "$TELEGRAM_MSG" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    \"parse_mode\": \"Markdown\"
  }" > /dev/null

# Odeslání emailu přes AgentMail
curl -s -X POST "https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX}/messages/send" \
  -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"alexbelis@icloud.com\",
    \"subject\": \"🔔 Pepa: $COUNT lead(ů) čeká na follow-up ($(date '+%d.%m.%Y'))\",
    \"text\": $(echo "$EMAIL_BODY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }" > /dev/null

echo "✅ Follow-up report odeslán: $COUNT lead(ů) — Telegram + email"
