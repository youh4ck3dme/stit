import { Link, useRouterState } from "@tanstack/react-router";
import {
  History,
  Megaphone,
  Phone,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  BANKS,
  DISCLAIMER,
  VERDICT_LABEL,
  type Analysis,
  type Verdict,
} from "@/lib/shield/engine";
import { quota, useShield } from "@/lib/shield/store";

export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16 2.2 4.8 7.1v8.4c0 6.7 4.6 11.6 11.2 13.8 6.6-2.2 11.2-7.1 11.2-13.8V7.1L16 2.2Z"
      />
      <path
        className="fill-bg"
        d="M16 8.1 11 10.2v4.8c0 3.3 2.2 5.8 5 6.8 2.8-1 5-3.5 5-6.8v-4.8L16 8.1Z"
      />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${light ? "text-ink" : "text-fg"}`}>
      <Mark className={`size-7 ${light ? "text-ink" : "text-brass"}`} />
      <span className="font-display text-xl leading-none">Štít</span>
    </span>
  );
}

const TONE: Record<Verdict, { bg: string; text: string; ring: string }> = {
  podvod: { bg: "bg-danger-bg", text: "text-danger", ring: "stroke-danger" },
  podozrive: { bg: "bg-warn-bg", text: "text-warn", ring: "stroke-warn" },
  "v-poriadku": { bg: "bg-safe-bg", text: "text-safe", ring: "stroke-safe" },
};

export function ScoreRing({ score, verdict }: { score: number; verdict: Verdict }) {
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circ;
  return (
    <svg viewBox="0 0 72 72" className="size-20 shrink-0" aria-hidden="true">
      <circle cx="36" cy="36" r={radius} className="stroke-line" strokeWidth="6" fill="none" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        className={TONE[verdict].ring}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="41"
        textAnchor="middle"
        className="fill-fg font-sans text-sm font-semibold"
      >
        {score}
      </text>
    </svg>
  );
}

export function VerdictCard({
  analysis,
  compact = false,
}: {
  analysis: Analysis;
  compact?: boolean;
}) {
  const tone = TONE[analysis.verdict];
  return (
    <article className={`rounded-2xl border border-line ${tone.bg} p-5`}>
      <div className="flex items-center gap-4">
        <ScoreRing score={analysis.score} verdict={analysis.verdict} />
        <div>
          <p className={`font-display text-4xl leading-none ${tone.text}`}>
            {VERDICT_LABEL[analysis.verdict]}
          </p>
          <p className="mt-2 text-sm text-fg">{analysis.type}</p>
        </div>
      </div>
      {!compact && (
        <ul className="mt-5 space-y-2 text-base text-fg">
          {analysis.reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone.text} bg-current`} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const NAV = [
  { to: "/kontrola", label: "Kontrola", icon: Shield },
  { to: "/historia", label: "História", icon: History },
  { to: "/rodina", label: "Rodina", icon: Users },
  { to: "/varovania", label: "Varovania", icon: Megaphone },
  { to: "/profil", label: "Profil", icon: UserRound },
] as const;

export function useShieldReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void Promise.resolve(useShield.persist.rehydrate()).then(() => {
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

export function AppShell({ children }: { children: ReactNode }) {
  const ready = useShieldReady();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const senior = useShield((state) => state.settings.senior);
  const family = useShield((state) => state.family);
  const phone = family?.guardianPhone ?? "";
  const showCall = senior && phone && family?.viewAs === "chraneny";

  return (
    <div className={`min-h-dvh bg-bg text-fg ${senior ? "senior" : ""}`}>
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-5">
        <Link to="/" className="rounded-md">
          <Wordmark />
        </Link>
        {senior ? (
          <span className="rounded-full bg-surface px-3 py-1 text-sm text-muted">Jednoduché</span>
        ) : (
          <Link to="/navod" className="text-sm text-muted">
            Ako vložiť
          </Link>
        )}
      </header>
      <main className="safe-pad mx-auto w-full max-w-lg px-5 pt-5">
        {ready ? children : <p className="text-muted">Načítavam…</p>}
      </main>
      {senior ? (
        <div className="nav-safe fixed inset-x-0 bottom-0 border-t border-line bg-raised/95 px-4 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg gap-2 pb-3">
            {showCall && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-brass text-lg font-semibold text-ink"
              >
                <Phone className="size-5" />
                Zavolať
              </a>
            )}
            <Link
              to="/kontrola"
              search={{ text: "", url: "", title: "", vzor: "" }}
              className="flex min-h-14 flex-1 items-center justify-center rounded-xl bg-surface text-lg font-semibold text-fg"
            >
              Skontrolovať
            </Link>
          </div>
          <div className="mx-auto flex max-w-lg justify-center gap-4 pb-3 text-sm text-faint">
            <Link to="/profil">Profil</Link>
            <Link to="/rodina" search={{ kod: "" }}>
              Rodina
            </Link>
          </div>
        </div>
      ) : (
        <nav className="nav-safe fixed inset-x-0 bottom-0 border-t border-line bg-raised/95 backdrop-blur">
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {NAV.map((item) => {
              const active = path === item.to || path.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                      active ? "text-brass" : "text-faint"
                    }`}
                  >
                    <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

export function QuotaLine() {
  const settings = useShield((state) => state.settings);
  const { used, limit, left } = quota(settings);
  if (!Number.isFinite(limit)) return <p className="text-sm text-muted">Neobmedzené kontroly</p>;
  return (
    <p className="text-sm text-muted">
      Zostáva ti {left} z {limit} kontrol
      <span className="text-faint"> · tento mesiac {used}</span>
    </p>
  );
}

export function BankList() {
  return (
    <ul className="space-y-2">
      {BANKS.map((bank) => (
        <li key={bank.name} className="flex items-center justify-between gap-3 rounded-xl bg-surface px-3 py-3">
          <span>
            <span className="block text-sm text-fg">{bank.name}</span>
            <span className="block text-xs text-faint">{bank.note}</span>
          </span>
          <a href={bank.href} className="shrink-0 rounded-lg bg-brass px-3 py-2 text-sm font-semibold text-ink">
            {bank.phone}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ResultBody({ analysis, pending = false }: { analysis: Analysis; pending?: boolean }) {
  const bad = analysis.verdict !== "v-poriadku";
  return (
    <div className="space-y-4">
      <VerdictCard analysis={analysis} />
      <section className="rounded-2xl border border-line bg-raised p-5">
        <h2 className="font-display text-2xl">Čo spraviť</h2>
        <ol className="mt-3 space-y-3">
          {analysis.steps.map((step, index) => (
            <li key={step} className="flex gap-3 text-base">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-sm text-brass">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>
      {bad && analysis.compromised.length > 0 && (
        <section className="rounded-2xl border border-danger/40 bg-danger-bg p-5">
          <h2 className="flex items-center gap-2 font-display text-2xl">
            <ShieldAlert className="size-5 text-danger" />
            Už som klikol
          </h2>
          <ul className="mt-3 space-y-2 text-base">
            {analysis.compromised.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <div className="mt-4">
            <BankList />
          </div>
          <p className="mt-3 text-sm text-muted">Polícia: 158. Nie číslo, ktoré ti nadiktoval volajúci.</p>
        </section>
      )}
      {analysis.links.length > 0 && (
        <section className="rounded-2xl border border-line bg-raised p-5">
          <h2 className="font-display text-2xl">Odkazy</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {analysis.links.map((link) => (
              <li key={link.href} className="break-all text-muted">
                <span className="text-fg">{link.host}</span>
                {" · "}
                {link.flag === "official"
                  ? "oficiálna stránka"
                  : link.flag === "lookalike"
                    ? "napodobenina"
                    : link.flag === "shortener"
                      ? "skracovač"
                      : link.flag === "suspicious"
                        ? "riziková doména"
                        : "neznáma stránka"}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="flex gap-2 text-sm text-faint">
        {analysis.source === "ai" ? <ShieldCheck className="size-4 shrink-0 text-brass" /> : <Shield className="size-4 shrink-0" />}
        <span>
          {pending
            ? "Pravidlá už rozhodli. AI ešte spresňuje verdikt."
            : analysis.source === "ai"
              ? "Posúdili to pravidlá aj AI."
              : "Rýchla kontrola pravidiel. AI teraz neodpovedala, verdikt stojí na známych vzoroch."}{" "}
          {DISCLAIMER}
        </span>
      </p>
    </div>
  );
}

export function PrimaryLink({
  to,
  children,
}: {
  to: "/kontrola" | "/rodina" | "/navod" | "/varovania";
  children: ReactNode;
}) {
  if (to === "/kontrola") {
    return (
      <Link
        to="/kontrola"
        search={{ text: "", url: "", title: "", vzor: "" }}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brass px-5 text-base font-semibold text-ink"
      >
        {children}
      </Link>
    );
  }
  if (to === "/rodina") {
    return (
      <Link
        to="/rodina"
        search={{ kod: "" }}
        className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brass px-5 text-base font-semibold text-ink"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brass px-5 text-base font-semibold text-ink"
    >
      {children}
    </Link>
  );
}
