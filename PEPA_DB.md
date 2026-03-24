# PEPA_DB — Firemní databáze

Přístup k firemní Neon DB pro Pepa Back Office Agent:

```
DATABASE_URL=postgresql://neondb_owner:npg_zbYd0Lf9TycJ@ep-delicate-scene-agy0jr3j-pooler.c-2.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

## Tabulky
- **klienti** — id, jmeno, email, telefon, zdroj, datum_akvizice
- **nemovitosti** — id, nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy
- **leady** — id, jmeno, email, zdroj, datum, nemovitost_id, stav
- **prodeje** — id, nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc
- **kalendar** — id, datum, cas_od, cas_do, typ, popis, obsazeno
- **chat_messages** — id, message, response, status (pending/done/error)

## Jak odpovídat na dotazy z webchatu

Když dostanu zprávu s prefixem `[PEPA WEBCHAT id=XXX]`:
1. Spustím SQL dotaz přes exec: `psql "DATABASE_URL" -c "SELECT ..."`
2. Zformuluji odpověď
3. Uložím ji: `psql "DATABASE_URL" -c "UPDATE chat_messages SET response='...', status='done' WHERE id='XXX'"`
