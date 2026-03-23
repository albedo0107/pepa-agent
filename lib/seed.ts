// Pepa Agent — Seed Mock Data
// Spustit: npx tsx lib/seed.ts

import { neon } from "@neondatabase/serverless";
import * as fs from "fs";
import * as path from "path";

const sql = neon(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Seeduji databázi...");

  // Schema
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  const statements = schema.split(";").filter((s) => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) await sql.query(stmt);
  }
  console.log("✅ Schema vytvořeno");

  // Klienti
  const klienti = [
    ["Jana Nováková", "jana.novakova@email.cz", "+420 601 111 222", "doporučení", "2026-01-05"],
    ["Petr Svoboda", "petr.svoboda@gmail.com", "+420 602 222 333", "web", "2026-01-12"],
    ["Marie Horáková", "marie.horakova@seznam.cz", "+420 603 333 444", "sreality", "2026-01-18"],
    ["Tomáš Dvořák", "tomas.dvorak@firma.cz", "+420 604 444 555", "bezrealitky", "2026-01-25"],
    ["Eva Procházková", "eva.prochazka@email.cz", "+420 605 555 666", "doporučení", "2026-02-03"],
    ["Martin Kučera", "martin.kucera@gmail.com", "+420 606 666 777", "web", "2026-02-10"],
    ["Lucie Veselá", "lucie.vesela@seznam.cz", "+420 607 777 888", "inzerce", "2026-02-17"],
    ["Ondřej Blažek", "ondrej.blazek@email.cz", "+420 608 888 999", "sreality", "2026-02-24"],
    ["Petra Marková", "petra.markova@gmail.com", "+420 609 999 000", "doporučení", "2026-03-03"],
    ["Jakub Pospíšil", "jakub.pospisil@firma.cz", "+420 610 000 111", "web", "2026-03-10"],
    ["Alžběta Černá", "alzb.cerna@email.cz", "+420 611 111 000", "bezrealitky", "2026-03-15"],
    ["Radek Novák", "radek.novak@gmail.com", "+420 612 222 111", "doporučení", "2026-03-18"],
    ["Simona Kratochvílová", "simona.kratochvil@seznam.cz", "+420 613 333 222", "sreality", "2025-10-05"],
    ["Pavel Šimánek", "pavel.simanek@email.cz", "+420 614 444 333", "web", "2025-10-20"],
    ["Veronika Tichá", "veronika.ticha@gmail.com", "+420 615 555 444", "inzerce", "2025-11-08"],
    ["Marek Jelínek", "marek.jelinek@firma.cz", "+420 616 666 555", "doporučení", "2025-11-22"],
    ["Tereza Kopecká", "tereza.kopecka@email.cz", "+420 617 777 666", "bezrealitky", "2025-12-01"],
    ["Lukáš Fiala", "lukas.fiala@gmail.com", "+420 618 888 777", "web", "2025-12-15"],
    ["Kristýna Sedláčková", "kristyna.sedlacek@seznam.cz", "+420 619 999 888", "sreality", "2025-12-28"],
    ["Michal Hájek", "michal.hajek@email.cz", "+420 620 000 999", "doporučení", "2026-01-08"],
  ];

  for (const k of klienti) {
    await sql`INSERT INTO klienti (jmeno, email, telefon, zdroj, datum_akvizice) VALUES (${k[0]}, ${k[1]}, ${k[2]}, ${k[3]}, ${k[4]}) ON CONFLICT DO NOTHING`;
  }
  console.log(`✅ ${klienti.length} klientů`);

  // Nemovitosti
  const nemovitosti = [
    ["Byt 2+kk Holešovice", "Dělnická 12, Praha 7", "Praha 7 - Holešovice", "byt", "2+kk", 5800000, "k prodeji", 52, 1935, 2018, "Kompletní rekonstrukce 2018", "Nová kuchyně, koupelna", "2026-01-10", 1],
    ["Byt 3+1 Vinohrady", "Mánesova 45, Praha 2", "Praha 2 - Vinohrady", "byt", "3+1", 9200000, "prodáno", 78, 1928, null, null, null, "2025-10-15", 2],
    ["Dům Braník", "K Brance 8, Praha 4", "Praha 4 - Braník", "dům", null, 14500000, "k prodeji", 185, 1960, 2015, "Zateplení, nová střecha", "Přístavba garáže 2020", "2026-02-01", 3],
    ["Byt 1+kk Žižkov", "Seifertova 22, Praha 3", "Praha 3 - Žižkov", "byt", "1+kk", 3200000, "k prodeji", 32, 2005, null, null, null, "2026-02-15", 4],
    ["Byt 2+1 Smíchov", "Nádražní 55, Praha 5", "Praha 5 - Smíchov", "byt", "2+1", 6500000, "rezervace", 65, 1985, 2020, "Rekonstrukce koupelny a kuchyně", null, "2026-01-20", 5],
    ["Komerční prostor Holešovice", "Komunardů 18, Praha 7", "Praha 7 - Holešovice", "komerční", null, 8900000, "k prodeji", 120, 1960, 2010, "Rekonstrukce fasády", "Nové rozvody elektřiny", "2026-03-01", 6],
    ["Byt 3+kk Nusle", "Nuselská 34, Praha 4", "Praha 4 - Nusle", "byt", "3+kk", 7800000, "k prodeji", 72, 2010, null, null, null, "2026-02-20", 7],
    ["Pozemek Čimice", "U Čimic 5, Praha 8", "Praha 8 - Čimice", "pozemek", null, 4200000, "k prodeji", 450, null, null, null, null, "2026-01-05", 8],
    ["Byt 4+kk Dejvice", "Jugoslávských partyzánů 12, Praha 6", "Praha 6 - Dejvice", "byt", "4+kk", 12800000, "prodáno", 98, 1938, 2019, "Celková rekonstrukce", "Bezbariérový přístup", "2025-11-10", 9],
    ["Byt 2+kk Holešovice", "Tusarova 28, Praha 7", "Praha 7 - Holešovice", "byt", "2+kk", 6100000, "k prodeji", 55, 1998, 2022, "Nová koupelna", null, "2026-03-10", 10],
    ["Byt 1+1 Žižkov", "Prokopova 8, Praha 3", "Praha 3 - Žižkov", "byt", "1+1", 3800000, "k prodeji", 38, 1975, null, null, null, "2026-03-05", 11],
    ["Dům Modřany", "K Modřanům 15, Praha 12", "Praha 12 - Modřany", "dům", null, 11200000, "prodáno", 160, 1978, 2016, "Rekonstrukce střechy a fasády", "Nová okna, topení", "2025-12-20", 12],
    ["Byt 2+kk Nové Město", "Štěpánská 44, Praha 1", "Praha 1 - Nové Město", "byt", "2+kk", 8500000, "k prodeji", 48, 1900, 2021, "Kompletní rekonstrukce historického bytu", "Zachované štuky", "2026-01-28", 13],
    ["Byt 3+1 Holešovice", "Plynární 7, Praha 7", "Praha 7 - Holešovice", "byt", "3+1", 8200000, "rezervace", 80, 1968, null, null, null, "2026-02-08", 14],
    ["Komerční prostor Žižkov", "Korunní 12, Praha 3", "Praha 3 - Žižkov", "komerční", null, 5600000, "k prodeji", 85, 1990, 2012, "Rekonstrukce interiéru", null, "2026-02-25", 15],
  ];

  for (const n of nemovitosti) {
    await sql`INSERT INTO nemovitosti (nazev, adresa, lokalita, typ, dispozice, cena_kc, stav, plocha_m2, rok_vystavby, rekonstrukce_rok, rekonstrukce_popis, stavebni_upravy, datum_pridani, klient_id) VALUES (${n[0]}, ${n[1]}, ${n[2]}, ${n[3]}, ${n[4]}, ${n[5]}, ${n[6]}, ${n[7]}, ${n[8]}, ${n[9]}, ${n[10]}, ${n[11]}, ${n[12]}, ${n[13]}) ON CONFLICT DO NOTHING`;
  }
  console.log(`✅ ${nemovitosti.length} nemovitostí`);

  // Leady — posledních 6 měsíců
  const zdroje = ["web", "sreality", "doporučení", "sociální sítě", "bezrealitky"];
  const stavy = ["nový", "kontaktován", "schůzka", "zamítnut", "konvertován"];
  const jmena = ["Adam Novák", "Barbora Svobodová", "Cyril Horák", "Dana Dvořáčková", "Emil Procházka", "Františka Kučerová", "Gabriela Veselá", "Hynek Blažek", "Ivana Marková", "Jan Pospíšil", "Kateřina Černá", "Libor Novák", "Monika Kratochvílová", "Norbert Šimánek", "Olga Tichá", "Pavel Jelínek", "Renata Kopecká", "Stanislav Fiala", "Táňa Sedláčková", "Urban Hájek", "Valerie Nováková", "Vladimír Svoboda"];

  const leady = [];
  // 6 měsíců zpátky od Března 2026
  const mesice = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
  const pocty = [18, 22, 15, 28, 35, 32]; // rostoucí trend

  for (let m = 0; m < mesice.length; m++) {
    for (let i = 0; i < pocty[m]; i++) {
      const jmeno = jmena[i % jmena.length];
      const zdroj = zdroje[Math.floor(Math.random() * zdroje.length)];
      const den = Math.floor(Math.random() * 27) + 1;
      const datum = `${mesice[m]}-${String(den).padStart(2, "0")}`;
      const stav = stavy[Math.floor(Math.random() * stavy.length)];
      const nemovitost_id = Math.floor(Math.random() * 15) + 1;
      leady.push([jmeno, `${jmeno.toLowerCase().replace(" ", ".")}@email.cz`, zdroj, datum, nemovitost_id, stav]);
    }
  }

  for (const l of leady) {
    await sql`INSERT INTO leady (jmeno, email, zdroj, datum, nemovitost_id, stav) VALUES (${l[0]}, ${l[1]}, ${l[2]}, ${l[3]}, ${l[4]}, ${l[5]})`;
  }
  console.log(`✅ ${leady.length} leadů`);

  // Prodeje
  const prodeje = [
    [2, 2, "2025-10-28", 9000000, 270000],
    [9, 9, "2025-11-15", 12500000, 375000],
    [12, 12, "2025-12-22", 10800000, 324000],
    [1, 1, "2026-01-18", 5650000, 169500],
    [5, 5, "2026-02-10", 6300000, 189000],
    [3, 3, "2026-03-05", 14200000, 426000],
  ];

  for (const p of prodeje) {
    await sql`INSERT INTO prodeje (nemovitost_id, klient_id, datum_prodeje, cena_prodeje, provize_kc) VALUES (${p[0]}, ${p[1]}, ${p[2]}, ${p[3]}, ${p[4]}) ON CONFLICT DO NOTHING`;
  }
  console.log(`✅ ${prodeje.length} prodejů`);

  // Kalendář — příštích 14 dní
  const dnes = new Date("2026-03-23");
  for (let d = 0; d < 14; d++) {
    const datum = new Date(dnes);
    datum.setDate(dnes.getDate() + d);
    const datumStr = datum.toISOString().split("T")[0];
    const denTydne = datum.getDay();
    if (denTydne === 0 || denTydne === 6) continue; // přeskočit víkend

    // Volné sloty
    const sloty = [
      ["09:00", "10:00", false],
      ["10:30", "11:30", d % 3 === 0],
      ["14:00", "15:00", d % 2 === 0],
      ["15:30", "16:30", false],
    ];

    for (const [cas_od, cas_do, obsazeno] of sloty) {
      await sql`INSERT INTO kalendar (datum, cas_od, cas_do, typ, popis, obsazeno) VALUES (${datumStr}, ${cas_od as string}, ${cas_do as string}, 'prohlídka', 'Dostupný slot pro prohlídku', ${obsazeno as boolean})`;
    }
  }
  console.log("✅ Kalendář (14 dní)");

  console.log("\n🎉 Seed dokončen!");
}

seed().catch(console.error);
