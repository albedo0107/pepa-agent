-- Pepa Agent — Database Schema
-- Realitní firma: klienti, nemovitosti, leady, prodeje, kalendář

CREATE TABLE IF NOT EXISTS klienti (
  id SERIAL PRIMARY KEY,
  jmeno TEXT NOT NULL,
  email TEXT,
  telefon TEXT,
  zdroj TEXT, -- odkud přišel: "doporučení", "web", "sreality", "bezrealitky", "inzerce"
  datum_akvizice DATE NOT NULL,
  poznamka TEXT
);

CREATE TABLE IF NOT EXISTS nemovitosti (
  id SERIAL PRIMARY KEY,
  nazev TEXT NOT NULL,
  adresa TEXT NOT NULL,
  lokalita TEXT NOT NULL, -- Praha 1, Praha 7 - Holešovice, atd.
  typ TEXT NOT NULL, -- byt, dům, pozemek, komerční
  dispozice TEXT, -- 1+kk, 2+1, 3+kk...
  cena_kc INTEGER,
  stav TEXT, -- prodáno, k prodeji, rezervace
  plocha_m2 INTEGER,
  rok_vystavby INTEGER,
  rekonstrukce_rok INTEGER, -- NULL = chybí data
  rekonstrukce_popis TEXT,  -- NULL = chybí data
  stavebni_upravy TEXT,     -- NULL = chybí data
  datum_pridani DATE,
  klient_id INTEGER REFERENCES klienti(id)
);

CREATE TABLE IF NOT EXISTS leady (
  id SERIAL PRIMARY KEY,
  jmeno TEXT NOT NULL,
  email TEXT,
  telefon TEXT,
  zdroj TEXT, -- "web", "sreality", "doporučení", "sociální sítě", "bezrealitky"
  datum DATE NOT NULL,
  nemovitost_id INTEGER REFERENCES nemovitosti(id),
  stav TEXT DEFAULT 'nový' -- nový, kontaktován, schůzka, zamítnut, konvertován
);

CREATE TABLE IF NOT EXISTS prodeje (
  id SERIAL PRIMARY KEY,
  nemovitost_id INTEGER REFERENCES nemovitosti(id),
  klient_id INTEGER REFERENCES klienti(id),
  datum_prodeje DATE NOT NULL,
  cena_prodeje INTEGER NOT NULL,
  provize_kc INTEGER
);

CREATE TABLE IF NOT EXISTS kalendar (
  id SERIAL PRIMARY KEY,
  datum DATE NOT NULL,
  cas_od TIME NOT NULL,
  cas_do TIME NOT NULL,
  typ TEXT NOT NULL, -- "prohlídka", "schůzka", "volno", "blokováno"
  popis TEXT,
  klient_jmeno TEXT,
  nemovitost_id INTEGER REFERENCES nemovitosti(id),
  obsazeno BOOLEAN DEFAULT false
);

-- Chat message queue (agent <-> frontend bridge)
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  response TEXT,
  status TEXT DEFAULT 'pending', -- pending, done, error
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
