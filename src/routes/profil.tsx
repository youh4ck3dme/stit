import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, QuotaLine } from "@/components/shield-ui";
import { DISCLAIMER } from "@/lib/shield/engine";
import { FREE_LIMIT, quota, useShield, type Plan } from "@/lib/shield/store";

export const Route = createFileRoute("/profil")({ component: ProfilPage });

const PLANS: { id: Plan; name: string; price: string }[] = [
  { id: "free", name: "Zadarmo", price: "0 €" },
  { id: "plus", name: "Plus", price: "2,99 €" },
  { id: "rodina", name: "Rodina", price: "4,99 €" },
];

function ProfilPage() {
  const settings = useShield((state) => state.settings);
  const reports = useShield((state) => state.reports);
  const setPlan = useShield((state) => state.setPlan);
  const setStoreText = useShield((state) => state.setStoreText);
  const setDisplayName = useShield((state) => state.setDisplayName);
  const setNotify = useShield((state) => state.setNotify);
  const setSenior = useShield((state) => state.setSenior);
  const clearAll = useShield((state) => state.clearAll);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState("");
  const { left, limit } = quota(settings);

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Profil</h1>
      <p className="mt-2 text-muted">Údaje zostávajú v tomto telefóne. Účet a platba pribudnú pri spustení.</p>

      <label className="mt-5 block text-sm text-muted">
        Meno
        <input
          value={settings.displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Ako ťa má appka oslovovať"
          className="mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg"
        />
      </label>

      <section className="mt-6">
        <h2 className="font-display text-2xl">Plán</h2>
        <p className="mt-1 text-sm text-faint">
          Ukážka. Nič sa nestrháva. {Number.isFinite(limit) ? `Zostáva ${left} z ${FREE_LIMIT}.` : "Neobmedzené kontroly."}
        </p>
        <div className="mt-3 grid gap-2">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setPlan(plan.id)}
              className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left ${
                settings.plan === plan.id ? "border-brass bg-surface" : "border-line bg-raised"
              }`}
            >
              <span className="font-semibold">{plan.name}</span>
              <span className="text-sm text-muted">{plan.price}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <QuotaLine />
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-2xl border border-line bg-raised p-4">
        <Toggle
          label="Ukladať text správy"
          hint="Predvolene sa uloží len verdikt. Číslo karty a rodné číslo sa aj tak skryjú."
          checked={settings.storeText}
          onChange={setStoreText}
        />
        <Toggle
          label="Jednoduchá obrazovka"
          hint="Väčšie písmo, jedna hlavná akcia, tlačidlo Zavolať."
          checked={settings.senior}
          onChange={setSenior}
        />
        <div>
          <Toggle
            label="Upozornenia v tomto telefóne"
            hint="Len keď vyjde podvod alebo podozrivé. Nie je to záruka, že príde vždy."
            checked={settings.notify}
            onChange={(value) => {
              setNotify(value);
              if (value && typeof Notification !== "undefined") {
                void Notification.requestPermission().then((permission) => {
                  setNotify(permission === "granted");
                  setNote(
                    permission === "granted"
                      ? "Upozornenia sú povolené."
                      : "Prehliadač upozornenia nepovolil.",
                  );
                });
              }
            }}
          />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-2xl">Nahlásené verdikty</h2>
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Keď verdikt nesedí, hlásenie z detailu skončí tu.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.map((report) => (
              <li key={report.id} className="rounded-xl bg-surface px-3 py-3 text-sm">
                <span className="text-brass">Nové</span>
                <span className="mt-1 block text-fg">{report.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line p-4">
        <h2 className="font-display text-2xl">Zmazať údaje</h2>
        <p className="mt-2 text-sm text-muted">
          Zmaže históriu, rodinu aj hlásenia v tomto telefóne. Nedá sa to vrátiť.
        </p>
        {!confirm ? (
          <button type="button" onClick={() => setConfirm(true)} className="mt-3 min-h-11 text-sm text-danger">
            Chcem to zmazať
          </button>
        ) : (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                clearAll();
                setConfirm(false);
                setNote("Údaje v tomto telefóne sú preč.");
              }}
              className="min-h-11 flex-1 rounded-xl bg-danger-bg font-semibold text-danger"
            >
              Zmazať natrvalo
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="min-h-11 flex-1 rounded-xl bg-surface"
            >
              Nechať
            </button>
          </div>
        )}
      </section>

      {note && <p className="mt-4 text-sm text-muted">{note}</p>}
      <p className="mt-6 text-sm text-faint">{DISCLAIMER}</p>
      <Link to="/navod" className="mt-3 inline-flex min-h-11 items-center text-sm text-brass">
        Ako vložiť správu z telefónu
      </Link>
    </AppShell>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-3">
      <span>
        <span className="block text-fg">{label}</span>
        <span className="mt-1 block text-xs text-faint">{hint}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 accent-brass"
      />
    </label>
  );
}
