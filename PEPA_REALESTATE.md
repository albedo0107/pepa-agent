# Sreality API — Lokalitní mapa

Použití: `curl -s 'https://www.sreality.cz/api/cs/v2/estates?category_main_cb=1&category_type_cb=1&locality_region_id=10&locality_district_id=DISTRICT_ID&per_page=5&sort=0' -H 'User-Agent: Mozilla/5.0'`

## District ID mapa (Praha)
| Oblast | district_id |
|--------|-------------|
| Praha 1 — Staré Město | 5001 |
| Praha 2 — Vinohrady | 5002 |
| Praha 3 — Žižkov | 5003 |
| Praha 4 — Nusle, Braník | 5004 |
| Praha 5 — Smíchov | 5005 |
| Praha 6 — Dejvice | 5006 |
| Praha 7 — Holešovice | 5013 |
| Praha 8 — Karlín | 5008 |
| Praha 9 — Vysočany | 5009 |
| Praha 10 — Vršovice | 5010 |

## Kategorie
- category_main_cb=1 → byty
- category_main_cb=2 → domy
- category_type_cb=1 → prodej
- category_type_cb=2 → pronájem

## Jak použít při dotazu uživatele
Když uživatel řekne "sleduj nabídky v Praha X" nebo "najdi byty v [oblast]":
1. Najdi district_id z tabulky výše
2. Spusť curl příkaz s odpovídajícím district_id
3. Vrať výsledky s cenou, dispozicí a lokalitou
