import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mark, PrimaryLink, VerdictCard, Wordmark } from "@/components/shield-ui";
import { DISCLAIMER, SAMPLES, analyzeRules } from "@/lib/shield/engine";

export const Route = createFileRoute("/")({ component: Home });

const PLANS = [
  {
    name: "Zadarmo",
    price: "0 €",
    period: "navždy",
    points: ["5 kontrol mesačne", "Varovania o aktuálnych podvodoch", "Verdikt, typ a čo spraviť"],
    href: "/kontrola" as const,
    cta: "Vyskúšať",
    featured: false,
  },
  {
    name: "Plus",
    price: "2,99 €",
    period: "mesačne",
    points: ["Neobmedzené kontroly", "Screenshoty a história", "29,90 € za rok, dva mesiace zadarmo"],
    href: "/kontrola" as const,
    cta: "Chcem Plus",
    featured: false,
  },
  {
    name: "Rodina",
    price: "4,99 €",
    period: "mesačne",
    points: ["Všetko z Plus pre 5 ľudí", "Upozornenie strážcovi", "Veľké tlačidlo Zavolať", "49,90 € za rok"],
    href: "/rodina" as const,
    cta: "Chrániť rodinu",
    featured: true,
  },
];

function Home() {
  const [sampleId, setSampleId] = useState(SAMPLES[0]?.id ?? "posta");
  const sample = SAMPLES.find((item) => item.id === sampleId) ?? SAMPLES[0];
  const analysis = useMemo(() => analyzeRules(sample?.text ?? ""), [sample]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Wordmark />
        <Link
          to="/kontrola"
          search={{ text: "", url: "", title: "", vzor: "" }}
          className="inline-flex min-h-11 items-center rounded-xl bg-brass px-4 text-sm font-semibold text-ink"
        >
          Skontrolovať
        </Link>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brass">Ochrana pred podvodmi</p>
            <h1 className="mt-3 font-display text-5xl leading-none text-fg md:text-6xl">
              Je to podvod? Opýtaj sa Štítu.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              Odpoveď máš za pár sekúnd. Po slovensky, na konkrétnu správu. A mama nemusí byť na to sama.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryLink to="/kontrola">Vyskúšať zadarmo</PrimaryLink>
              <a
                href="#rodina"
                className="inline-flex min-h-12 items-center rounded-xl border border-line px-5 text-base text-fg"
              >
                Chráň mamu
              </a>
            </div>
            <p className="mt-4 text-sm text-faint">Za cenu kávy mesačne pokoj pre celú rodinu.</p>
          </div>

          <div className="rounded-2xl border border-line bg-raised p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SAMPLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSampleId(item.id)}
                  className={`min-h-10 rounded-full px-3 text-sm ${
                    item.id === sampleId ? "bg-brass text-ink" : "bg-surface text-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-fg">{sample?.text}</p>
            <div className="mt-3">
              {analysis && <VerdictCard analysis={analysis} compact />}
            </div>
            <p className="mt-3 text-xs text-faint">
              Ukážka beží na miestnych pravidlách, bez odoslania správy. V aplikácii sa pridá aj AI.
            </p>
          </div>
        </section>

        <section className="border-t border-line bg-raised">
          <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-14 md:grid-cols-3">
            {[
              ["1", "Vlož správu", "Text, odkaz alebo screenshot. Zo schránky, nie z cudzej aplikácie."],
              ["2", "Dostaneš verdikt", "Podvod, podozrivé alebo v poriadku. K tomu skóre, typ a tri dôvody."],
              ["3", "Vieš, čo spraviť", "Zmazať, neklikať, zavolať banke. V rodine sa to dozvie aj strážca."],
            ].map(([step, title, body]) => (
              <div key={step}>
                <p className="font-display text-3xl text-brass">{step}</p>
                <h2 className="mt-2 text-2xl">{title}</h2>
                <p className="mt-2 text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="rodina" className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold text-brass">Rodinný režim</p>
            <h2 className="mt-2 text-4xl">Chráň mamu, aj keď nie si pri nej.</h2>
            <p className="mt-4 text-lg text-muted">
              Syn vytvorí rodinu a pošle pozvánku. Keď mama skontroluje podvod, syn vidí len verdikt a typ.
              Celý text správy nie, pokiaľ to mama sama nepovolí.
            </p>
            <ul className="mt-4 space-y-2 text-fg">
              <li>Veľké tlačidlo Zavolať synovi.</li>
              <li>Jednoduchá obrazovka, väčšie písmo, bez menu.</li>
              <li>Žiadna reklama a žiadny predaj dát.</li>
            </ul>
            <div className="mt-6">
              <PrimaryLink to="/rodina">Vytvoriť rodinu</PrimaryLink>
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm text-faint">Upozornenie pre strážcu</p>
            <p className="mt-3 font-display text-3xl leading-tight">Mama dostala podvodnú SMS.</p>
            <p className="mt-3 text-muted">Falošná pošta. Nič nezadala. Verdikt: podvod, skóre 92.</p>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-bg px-4 py-3">
              <Mark className="size-8 text-brass" />
              <span className="text-sm">Text správy ostal u mamy.</span>
            </div>
          </div>
        </section>

        <section id="cena" className="border-t border-line">
          <div className="mx-auto w-full max-w-5xl px-5 py-16">
            <h2 className="text-4xl">Koľko to stojí</h2>
            <p className="mt-2 max-w-lg text-muted">
              Platba kartou príde pri spustení. Teraz si plány môžeš v profile prepnúť a pozrieť, čo v nich je.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <article
                  key={plan.name}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    plan.featured ? "border-brass bg-surface" : "border-line bg-raised"
                  }`}
                >
                  <h3 className="text-2xl">{plan.name}</h3>
                  <p className="mt-3 font-display text-4xl">
                    {plan.price}{" "}
                    <span className="font-sans text-base text-muted">{plan.period}</span>
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                    {plan.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <Link
                    to={plan.href}
                    search={
                      plan.href === "/rodina"
                        ? { kod: "" }
                        : { text: "", url: "", title: "", vzor: "" }
                    }
                    className={`mt-6 inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold ${
                      plan.featured ? "bg-brass text-ink" : "bg-surface text-fg"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-3xl px-5 pb-16">
          <h2 className="text-4xl">Otázky</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {[
              [
                "Ukladáte text správy?",
                "Predvolene nie. Uloží sa verdikt, typ a skóre. Text len ak to v profile zapneš. Číslo karty a rodné číslo sa pred uložením skryjú.",
              ],
              [
                "Je verdikt záruka?",
                "Nie. Štít je pomocník. Keď váha, skôr povie podozrivé ako v poriadku. Pri peniazoch volaj banku.",
              ],
              [
                "Ako to zruším?",
                "Údaje v tomto telefóne zmažeš v profile jedným tlačidlom. Predplatné pôjde zrušiť na dva kliky, keď budú platby zapnuté.",
              ],
              [
                "Funguje to na iPhone?",
                "Áno. Správu skopíruješ a vložíš, alebo pošleš screenshot. Návod má tri kroky.",
              ],
            ].map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex items-center justify-between gap-4 text-lg">
                  {q}
                  <span className="text-brass group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-muted">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-5 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 text-sm text-faint md:flex-row md:items-center md:justify-between">
          <p>{DISCLAIMER}</p>
          <div className="flex gap-4">
            <Link to="/navod">Návod</Link>
            <Link to="/varovania">Varovania</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
