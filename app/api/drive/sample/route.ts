import { NextResponse } from "next/server";

const CSV = `TYP,NAZEV,ADRESA,CENA_KS,PLOCHA,STAV,POZNAMKA
nemovitost,Byt 3+kk Karlin,Sokolovska 12 Praha 8,9800000,75,k prodeji,Nova rekonstrukce 2025 balkon
nemovitost,Rodinny dum Ricany,Manesova 5 Ricany,12500000,180,k prodeji,Zahrada 400m2 garaz bazen
nemovitost,Byt 2+kk Zizkov,Seifertova 44 Praha 3,5200000,48,k prodeji,Chybi data o rekonstrukci
nemovitost,Penthouse Vinohrady,Manesova 89 Praha 2,28000000,210,k prodeji,Terasa 80m2 vyhled na Prahu
lead,Pavel Horak,pavel.horak@firma.cz,0,0,vysoka,Zajem byt 3+kk Praha centrum do 10M doporuceni
lead,Jana Prochazkova,j.prochazkova@gmail.com,0,0,novy,Zajem dum Praha okoli do 15M Sreality
lead,Martin Blazek,blazek@albedoai.cz,0,0,vysoka,Investicni byt k pronajmu web
lead,Tereza Novackova,tereza.novackova@seznam.cz,0,0,novy,Zajem byt 2+kk Vinohrady do 7M Bezrealitky
lead,Robert Simanek,robert.simanek@email.cz,0,0,novy,Zajem komercni prostor Praha 5 inzerce
lead,Petra Vesela,petra.vesela@firma.cz,0,0,novy,Zajem byt nebo dum Praha 6 doporuceni`;

export async function GET() {
  return new NextResponse(CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=nove_leady.csv",
    },
  });
}
