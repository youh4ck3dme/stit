import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardPaste, ImagePlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { AppShell, QuotaLine } from "@/components/shield-ui";
import { checkMessage } from "@/lib/shield/ask";
import { SAMPLES, analyzeRules, redactSensitive } from "@/lib/shield/engine";
import { quota, useShield, type CheckRecord } from "@/lib/shield/store";

type Search = { text: string; url: string; title: string; vzor: string };

export const Route = createFileRoute("/kontrola")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    text: typeof search.text === "string" ? search.text : "",
    url: typeof search.url === "string" ? search.url : "",
    title: typeof search.title === "string" ? search.title : "",
    vzor: typeof search.vzor === "string" ? search.vzor : "",
  }),
  component: KontrolaPage,
});

function seedFrom(search: Search): string {
  const incoming = [search.title, search.text, search.url].map((part) => part.trim()).filter(Boolean);
  if (incoming.length) return incoming.join("\n");
  return SAMPLES.find((item) => item.id === search.vzor)?.text ?? "";
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function fileToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1280;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Obrázok sa nepodarilo pripraviť.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.72);
}

function KontrolaPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const run = useServerFn(checkMessage);
  const [text, setText] = useState(() => seedFrom(search));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const settings = useShield((state) => state.settings);
  const family = useShield((state) => state.family);
  const addCheck = useShield((state) => state.addCheck);
  const pushAlert = useShield((state) => state.pushAlert);
  const senior = settings.senior;
  const { left } = quota(settings);

  async function paste() {
    setError("");
    try {
      const value = await navigator.clipboard.readText();
      if (!value.trim()) {
        setNotice("Schránka je prázdna.");
        return;
      }
      setText(value);
      setNotice("");
    } catch {
      setError("Schránku sa nepodarilo prečítať. Podrž text a vlož ho sem ručne.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Potrebujem obrázok, nie iný súbor.");
      return;
    }
    setBusy(true);
    try {
      const imageDataUrl = await fileToJpeg(file);
      await submit("", imageDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screenshot sa nepodarilo načítať.");
      setBusy(false);
    }
  }

  function remember(record: CheckRecord) {
    addCheck(record);
    if (family && record.verdict !== "v-poriadku") {
      pushAlert({ checkId: record.id, verdict: record.verdict, type: record.type });
    }
    if (
      settings.notify &&
      record.verdict !== "v-poriadku" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const who = family?.viewAs === "chraneny" ? family.protectedName || "Chránený člen" : "Kontrola";
      new Notification("Štít", {
        body: `${who}: ${record.verdict === "podvod" ? "podvod" : "podozrivé"} · ${record.type}`,
      });
    }
  }

  function refineLater(id: string, source: string) {
    void withTimeout(run({ data: { text: source } }), 20_000)
      .then((result) => {
        if (!result.ok) {
          useShield.getState().updateCheck(id, { pendingAi: false });
          return;
        }
        const analysis = result.analysis;
        useShield.getState().updateCheck(id, {
          verdict: analysis.verdict,
          score: analysis.score,
          type: analysis.type,
          reasons: analysis.reasons,
          steps: analysis.steps,
          compromised: analysis.compromised,
          source: analysis.source,
          linkHosts: analysis.links.map((link) => link.host),
          linkFlags: analysis.links.map((link) => link.flag),
          pendingAi: false,
        });
        if (useShield.getState().family && analysis.verdict !== "v-poriadku") {
          useShield.getState().pushAlert({
            checkId: id,
            verdict: analysis.verdict,
            type: analysis.type,
          });
        }
      })
      .catch(() => {
        useShield.getState().updateCheck(id, { pendingAi: false });
      });
  }

  async function submit(overrideText?: string, imageDataUrl?: string) {
    const source = (overrideText ?? text).trim();
    if (!source && !imageDataUrl) {
      setError("Vlož správu, odkaz alebo screenshot.");
      return;
    }
    if (settings.plan === "free" && left <= 0) {
      setError("Bezplatné kontroly na tento mesiac sa minuli. V profile si môžeš prepnúť ukážku Plus.");
      setBusy(false);
      return;
    }
    setError("");

    if (!imageDataUrl) {
      const rules = analyzeRules(source);
      const record: CheckRecord = {
        id: crypto.randomUUID(),
        at: Date.now(),
        verdict: rules.verdict,
        score: rules.score,
        type: rules.type,
        reasons: rules.reasons,
        steps: rules.steps,
        compromised: rules.compromised,
        source: "pravidla",
        pendingAi: true,
        linkHosts: rules.links.map((link) => link.host),
        linkFlags: rules.links.map((link) => link.flag),
        text: settings.storeText ? redactSensitive(source).text : undefined,
      };
      remember(record);
      refineLater(record.id, source);
      await navigate({ to: "/historia/$id", params: { id: record.id } });
      return;
    }

    setBusy(true);
    try {
      const result = await withTimeout(run({ data: { text: source, imageDataUrl } }), 22_000);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      const extracted = result.extracted.trim() || source;
      const rules = analyzeRules(extracted);
      const analysis = result.analysis.links.length ? result.analysis : { ...result.analysis, links: rules.links };
      const record: CheckRecord = {
        id: crypto.randomUUID(),
        at: Date.now(),
        verdict: analysis.verdict,
        score: analysis.score,
        type: analysis.type,
        reasons: analysis.reasons,
        steps: analysis.steps,
        compromised: analysis.compromised,
        source: analysis.source,
        linkHosts: analysis.links.map((link) => link.host),
        linkFlags: analysis.links.map((link) => link.flag),
        text: settings.storeText ? redactSensitive(extracted).text : undefined,
      };
      remember(record);
      setBusy(false);
      await navigate({ to: "/historia/$id", params: { id: record.id } });
    } catch {
      setBusy(false);
      setError("Screenshot sa nepodarilo prečítať. Skús to znova alebo prepíš text.");
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl">{senior ? "Je to podvod?" : "Skontrolovať"}</h1>
      <p className="mt-2 text-muted">
        {senior
          ? "Vlož sem správu. Štít povie, či je v poriadku."
          : "Vlož podozrivú správu alebo odkaz. Nič sa neodošle, kým nedáš Skontrolovať."}
      </p>
      <div className="mt-4">
        <QuotaLine />
      </div>
      <label className="mt-4 block">
        <span className="sr-only">Správa alebo odkaz</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Vlož sem podozrivú správu alebo odkaz"
          className="check-input mt-2 min-h-44 w-full rounded-2xl border border-line bg-surface px-4 py-3 text-base text-fg outline-none placeholder:text-faint"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void paste()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface text-sm font-semibold"
        >
          <ClipboardPaste className="size-4" />
          Zo schránky
        </button>
        <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface text-sm font-semibold">
          <ImagePlus className="size-4" />
          Screenshot
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void onFile(file);
            }}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-3 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brass text-lg font-semibold text-ink disabled:opacity-60"
      >
        {busy && <Loader2 className="size-5 animate-spin" />}
        Skontrolovať
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      {notice && <p className="mt-3 text-sm text-muted">{notice}</p>}
      {!senior && (
        <div className="mt-8">
          <p className="text-sm text-faint">Takto vyzerá podvod</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setText(item.text)}
                className="min-h-10 rounded-full border border-line px-3 text-sm text-muted"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
