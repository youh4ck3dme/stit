import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shield-ui";
import { VERDICT_LABEL } from "@/lib/shield/engine";
import { useShield } from "@/lib/shield/store";

type Search = { kod: string };

export const Route = createFileRoute("/rodina")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    kod: typeof search.kod === "string" ? search.kod : "",
  }),
  component: RodinaPage,
});

function RodinaPage() {
  const search = Route.useSearch();
  const family = useShield((state) => state.family);
  const createFamily = useShield((state) => state.createFamily);
  const joinFamily = useShield((state) => state.joinFamily);
  const setView = useShield((state) => state.setView);
  const setShareText = useShield((state) => state.setShareText);
  const setGuardianPhone = useShield((state) => state.setGuardianPhone);
  const markAlert = useShield((state) => state.markAlert);
  const setSenior = useShield((state) => state.setSenior);
  const senior = useShield((state) => state.settings.senior);

  const [name, setName] = useState("Naša rodina");
  const [guardian, setGuardian] = useState("");
  const [phone, setPhone] = useState("");
  const [invite, setInvite] = useState(search.kod);
  const [protectedName, setProtectedName] = useState("Mama");
  const [message, setMessage] = useState("");
  const [svg, setSvg] = useState("");

  const link =
    typeof window !== "undefined" && family
      ? `${window.location.origin}/rodina?kod=${family.code}`
      : "";

  useEffect(() => {
    if (!family) return;
    const url = `${window.location.origin}/rodina?kod=${family.code}`;
    let live = true;
    void import("qrcode")
      .then((mod) => {
        const qr = mod as {
          toString?: (text: string, opts: object) => Promise<string>;
          default?: { toString: (text: string, opts: object) => Promise<string> };
        };
        const toString = qr.default?.toString ?? qr.toString;
        if (!toString) throw new Error("qr");
        return toString(url, {
          type: "svg",
          margin: 1,
          color: { dark: "#1A140C", light: "#F4EFE6" },
        });
      })
      .then((markup) => {
        if (live) setSvg(markup);
      })
      .catch(() => {
        if (live) setSvg("");
      });
    return () => {
      live = false;
    };
  }, [family]);

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Rodina</h1>
      <p className="mt-2 text-muted">
        Strážca vidí verdikt a typ podvodu. Text správy nie, pokiaľ to chránený člen sám nepovolí.
      </p>

      {!family ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createFamily({ name, guardianName: guardian, guardianPhone: phone });
          }}
        >
          <Field label="Názov rodiny" value={name} onChange={setName} />
          <Field label="Tvoje meno" value={guardian} onChange={setGuardian} placeholder="Erik" />
          <Field label="Telefón, na ktorý má mama zavolať" value={phone} onChange={setPhone} placeholder="09xx xxx xxx" />
          <button
            type="submit"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brass font-semibold text-ink"
          >
            Vytvoriť rodinu
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <section className="rounded-2xl border border-line bg-raised p-5">
            <p className="text-sm text-faint">{family.name}</p>
            <h2 className="mt-1 font-display text-3xl">
              {family.viewAs === "strazca" ? "Si strážca" : "Si chránený člen"}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("strazca");
                  setSenior(false);
                }}
                className={`min-h-11 rounded-xl text-sm font-semibold ${
                  family.viewAs === "strazca" ? "bg-brass text-ink" : "bg-surface text-fg"
                }`}
              >
                Strážca
              </button>
              <button
                type="button"
                onClick={() => setView("chraneny")}
                className={`min-h-11 rounded-xl text-sm font-semibold ${
                  family.viewAs === "chraneny" ? "bg-brass text-ink" : "bg-surface text-fg"
                }`}
              >
                Chránený
              </button>
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 text-sm">
              <span>Jednoduchá obrazovka</span>
              <input
                type="checkbox"
                checked={senior}
                onChange={(event) => setSenior(event.target.checked)}
                className="size-5 accent-brass"
              />
            </label>
          </section>

          {family.viewAs === "strazca" && (
            <section className="rounded-2xl border border-line bg-raised p-5">
              <h2 className="font-display text-2xl">Pozvánka</h2>
              <p className="mt-2 text-sm text-muted">
                Kód <span className="font-semibold text-fg">{family.code}</span>. Na jednom telefóne
                ho môžeš prijať aj sám, aby si videl obrazovku mamy.
              </p>
              {svg && (
                <div
                  className="mx-auto mt-4 w-48 rounded-xl bg-fg p-3 [&_svg]:h-auto [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(link);
                  setMessage("Odkaz je v schránke.");
                }}
                className="mt-3 min-h-11 w-full rounded-xl bg-surface text-sm font-semibold"
              >
                Kopírovať odkaz
              </button>
              <label className="mt-4 block text-sm text-muted">
                Telefón strážcu
                <input
                  value={family.guardianPhone}
                  onChange={(event) => setGuardianPhone(event.target.value)}
                  className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-fg"
                />
              </label>
            </section>
          )}

          <section className="rounded-2xl border border-line bg-raised p-5">
            <h2 className="font-display text-2xl">Prijať pozvánku</h2>
            <form
              className="mt-3 space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                const ok = joinFamily(invite || family.code, protectedName);
                setMessage(ok ? "Si chránený člen. Obrazovka je jednoduchšia." : "Kód nesedí.");
              }}
            >
              <Field label="Kód" value={invite} onChange={setInvite} placeholder={family.code} />
              <Field label="Ako ťa má strážca vidieť" value={protectedName} onChange={setProtectedName} />
              <button type="submit" className="min-h-11 w-full rounded-xl bg-surface text-sm font-semibold">
                Prijať ako chránený člen
              </button>
            </form>
          </section>

          {family.viewAs === "chraneny" && (
            <label className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-raised p-4 text-sm">
              <span>
                Strážca môže vidieť aj text správy
                <span className="mt-1 block text-faint">Predvolene vidí len verdikt a typ.</span>
              </span>
              <input
                type="checkbox"
                checked={family.shareText}
                onChange={(event) => setShareText(event.target.checked)}
                className="mt-1 size-5 accent-brass"
              />
            </label>
          )}

          <section>
            <h2 className="font-display text-2xl">Upozornenia</h2>
            {family.alerts.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Keď chránený člen skontroluje podvod, objaví sa tu. Text správy sa neukáže.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {family.alerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      onClick={() => markAlert(alert.id)}
                      className="w-full rounded-2xl border border-line bg-raised px-4 py-3 text-left"
                    >
                      <span className="text-sm text-brass">
                        {family.protectedName || "Člen"} · {VERDICT_LABEL[alert.verdict]}
                        {!alert.read ? " · nové" : ""}
                      </span>
                      <span className="mt-1 block">{alert.type}. Nič zo správy sa sem neposiela.</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {message && <p className="text-sm text-muted">{message}</p>}
        </div>
      )}
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg"
      />
    </label>
  );
}
