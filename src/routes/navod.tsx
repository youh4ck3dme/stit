import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shield-ui";

export const Route = createFileRoute("/navod")({ component: NavodPage });

const STEPS = [
  {
    title: "Skopíruj správu",
    body: "Na iPhone podrž správu a daj Kopírovať. Na Androide to isté. Ponuka Zdieľať príde, keď ju systém aplikácii dovolí.",
  },
  {
    title: "Vlož ju do Štítu",
    body: "Otvor Skontrolovať a daj Zo schránky. Screenshot ide tlačidlom Screenshot.",
  },
  {
    title: "Prečítaj verdikt",
    body: "Červená je podvod, oranžová podozrivé, zelená v poriadku. Pri peniazoch aj tak zavolaj banku.",
  },
];

type InstallEvent = Event & { prompt: () => Promise<void> };

function NavodPage() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (incoming: Event) => {
      incoming.preventDefault();
      setDeferred(incoming as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  return (
    <AppShell>
      <h1 className="font-display text-4xl">Na plochu, aj do správy</h1>
      <p className="mt-2 text-muted">Štít sa inštaluje z prehliadača. Obchod s aplikáciami zatiaľ netreba.</p>
      <ol className="mt-6 space-y-4">
        {STEPS.map((step, index) => (
          <li key={step.title} className="rounded-2xl border border-line bg-raised p-4">
            <p className="text-sm text-brass">Krok {index + 1}</p>
            <h2 className="mt-1 font-display text-2xl">{step.title}</h2>
            <p className="mt-2 text-muted">{step.body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6">
        {deferred ? (
          <button
            type="button"
            onClick={() => {
              void deferred.prompt();
              setDeferred(null);
            }}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brass font-semibold text-ink"
          >
            Nainštalovať na plochu
          </button>
        ) : (
          <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            Na iPhone: v Safari daj Zdieľať a potom Pridať na plochu. Na Androide: menu prehliadača a
            Nainštalovať aplikáciu.
          </p>
        )}
      </div>
    </AppShell>
  );
}
