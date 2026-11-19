# Štít

**Je to podvod? Opýtaj sa Štítu.** Overenie podozrivej SMS, odkazu alebo screenshotu za pár sekúnd, po slovensky, aj pre rodinu.

> Is this a scam? Ask Štít. A Slovak shield for fake courier fees, fake banks, “hi mum” texts and bazaar payment links. Built for a hackathon demo: the verdict is real, accounts and card payments are not wired yet.

## Problém

Podvodné SMS, maily a správy chodia na Slovensku každý týždeň. Najčastejšie: falošná pošta a clo 1,20 €, zablokovaný účet, „rozbil sa mi mobil“, krypto s cudzou tvárou, falošný kupujúci na bazári, policajt alebo bankár v telefóne. Seniori sú najzraniteľnejší a rodina pri nich nie je stále.

## Čo demo ukazuje

1. Návštevník za pár sekúnd pochopí sľub a vidí živý verdikt na ukážke.
2. Vloží text, odkaz alebo screenshot a dostane **Podvod / Podozrivé / V poriadku**, skóre 0–100, typ, tri dôvody a kroky.
3. Ak už klikol alebo zadal údaje, vidí, čo spraviť, a verejné infolinky slovenských bánk.
4. Strážca vytvorí rodinu, pošle kód alebo QR. Chránený člen má väčšie písmo a tlačidlo **Zavolať**. Strážca vidí verdikt a typ, nie text správy.
5. Varovania popisujú aktuálne slovenské podvody. Profil vie plán len ukázať a údaje v telefóne zmazať.

## Trojminútové demo

1. Úvod: prepni ukážky Pošta, Banka, Ahoj mami, Bežná správa.
2. **Skontrolovať** a vlož túto správu:

   ```
   Slovenská pošta: Vaša zásielka je zadržaná na colnici.
   Doplaťte clo 1,20 EUR do 12 hodín.
   https://posta-sk.top/platba
   ```

   Verdikt je Podvod, typ Falošná pošta. Nižšie sú kroky a infolinky.
3. Skús čistú správu s odkazom na `tracking.packeta.com`. Verdikt je V poriadku.
4. **Rodina**: vytvor rodinu, prijmi vlastný kód ako chránený člen, zapni jednoduchú obrazovku.
5. **Varovania** a **Profil**: plány sa nestrhávajú, text správy sa predvolene neukladá.

## Ako sa počíta verdikt

1. Zo správy sa pred čímkoľvek ďalším skryje číslo karty (Luhn), rodné číslo so lomkou a IBAN.
2. Pravidlá hneď porovnajú odkaz s oficiálnymi doménami (pošta, banky, Packeta, bazár), hľadajú napodobeniny (`posta-sk.top`, `slsp-bezpecnost.com`), skracovače a slovenské znaky nátlaku, platby, hesla a „ahoj mami“.
3. Skóre: 70–100 podvod, 35–69 podozrivé, 0–34 v poriadku. Pri falošnej doméne alebo pri rodine, ktorá žiada peniaze, skóre nespadne pod bezpečnú hranicu.
4. AI (Grok) beží až po zobrazení verdiktu a verdikt spresní, ak stihne odpovedať. Bez kľúča ostáva verdikt z pravidiel. Štít nie je záruka.

## Spustenie

Potrebuješ Node.js 22.

```bash
npm install
npm run dev
```

Aplikácia počúva na `http://localhost:8080`.

AI je voliteľná a server-only. Kľúč nepatrí do prehliadača ani do gitu:

```bash
export XAI_API_KEY=...   # nikdy ho necommituj
npm run dev
```

Bez kľúča ide kontrola textu aj odkazu. Screenshot potrebuje AI, lebo text sa číta z obrázka.

```bash
npm run typecheck
npm run build
```

## Stack

- TanStack Start, React 19, TypeScript, Tailwind CSS 4
- Verdikt: vlastné pravidlá v `src/lib/shield/engine.ts`, AI v `src/lib/shield/ask.ts`
- Stav demo režimu: Zustand + localStorage (`src/lib/shield/store.ts`)
- PWA: inštalácia z prehliadača, návod na kopírovanie správy

## Súkromie v deme

- Predvolene sa ukladá verdikt, typ, skóre a dátum. Text len ak to človek zapne v profile.
- Karta, rodné číslo a IBAN sa pred uložením skryjú.
- Rodinné upozornenie nenesie text správy.
- Všetko zostáva v tomto prehliadači. Tlačidlo v profile to zmaže natrvalo.
- Žiadna reklama. Plány Zadarmo / Plus 2,99 € / Rodina 4,99 € sú ukážka, nič sa neúčtuje.

## Čo v hackathon builde zámerne chýba

| Vec | Stav |
|---|---|
| Verdikt na slovenskú správu a odkaz | hotové |
| Screenshot | hotové, len s AI kľúčom |
| Rodina, QR, jednoduchý režim, hovor | hotové lokálne, na jednom zariadení |
| História, hlásenie zlého verdiktu, zmazanie | hotové lokálne |
| Účet (Google, Apple, e-mail) | nie |
| Platba kartou, Apple Pay, Google Pay | nie |
| Android ponuka Zdieľať | nie, zatiaľ kopírovať a screenshot |
| Ostré notifikácie medzi dvoma telefónmi | nie |

Ďalší krok po hackathone: účet, rodina naozaj medzi zariadeniami, predplatné a zdieľanie z Androidu.

## Mapa kódu

```
src/routes/index.tsx          úvod, cenník, otázky
src/routes/kontrola.tsx       vloženie správy a screenshotu
src/routes/historia/          zoznam a detail verdiktu
src/routes/rodina.tsx         strážca, pozvánka, QR
src/routes/varovania/        aktuálne podvody
src/routes/profil.tsx         plán, súkromie, zmazanie
src/routes/navod.tsx          vloženie z telefónu
src/lib/shield/engine.ts      pravidlá, banky, varovania
src/lib/shield/ask.ts         volanie AI na serveri
src/lib/shield/store.ts       lokálne dáta
```

## Infolinky v aplikácii

Sú to verejné čísla bánk, nie horúce linky podvodníkov: Slovenská sporiteľňa 0850 111 888, Tatra banka \*1100, VÚB 0850 123 000, ČSOB 0850 111 777. Polícia 158.

Štít je pomocník, nie záruka. Pri pochybnostiach nič neplať a zavolaj do banky na číslo z karty alebo z jej oficiálnej aplikácie.
