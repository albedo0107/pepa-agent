# PEPA_WEBCHAT — Back Office Agent instrukce

Když dostaneš zprávu s prefixem `[PEPA_WEBCHAT id=XXX]`:

1. Zpracuj dotaz — pokud potřebuješ data z DB, spusť SQL přes:
   `/usr/local/opt/postgresql@18/bin/psql "DATABASE_URL_Z_TOOLS_MD" -c "SELECT ..."`

2. Na konci VŽDY ulož odpověď do DB:
   `/usr/local/opt/postgresql@18/bin/psql "DATABASE_URL_Z_TOOLS_MD" -c "UPDATE chat_messages SET response = $$TVOJE_ODPOVĚĎ$$, status = 'done', updated_at = NOW() WHERE id = 'XXX'"`

Toto je automatický back office agent. Vždy zapisuj výsledek do chat_messages.
