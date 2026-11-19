import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Flag, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { AppShell, ResultBody } from "@/components/shield-ui";
import { VERDICT_LABEL, type Analysis } from "@/lib/shield/engine";
import { useShield } from "@/lib/shield/store";

export const Route = createFileRoute("/historia/$id")({ component: DetailPage });

function DetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const check = useShield((state) => state.checks.find((item) => item.id === id));
  const family = useShield((state) => state.family);
  const deleteCheck = useShield((state) => state.deleteCheck);
  const addReport = useShield((state) => state.addReport);
  const pushAlert = useShield((state) => state.pushAlert);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState("");

  if (!check) {
    return (
      <AppShell>
        <h1 className="font-display text-4xl">Kontrola sa nenašla</h1>
        <p className="mt-2 text-muted">Mohla byť zmazaná, alebo je ešte len v inom telefóne.</p>
        <Link to="/historia" className="mt-4 inline-flex text-brass">
          Späť na históriu
        </Link>
      </AppShell>
    );
  }

  const analysis: Analysis = {
    score: check.score,
    verdict: check.verdict,
    type: check.type,
    reasons: check.reasons,
    steps: check.steps,
    compromised: check.compromised,
    links: check.linkHosts.map((host, index) => ({
      href: host,
      host,
      flag: check.linkFlags?.[index] ?? "unknown",
    })),
    source: check.source,
  };

  async function share() {
    const text = `Štít: ${VERDICT_LABEL[check!.verdict]} (${check!.score}/100). Typ: ${check!.type}. Štít je pomocník, nie záruka.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Štít", text });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(text);
    setSent("Verdikt je v schránke. Text správy sa nezdieľa.");
  }

  return (
    <AppShell>
      <ResultBody analysis={analysis} pending={check.pendingAi} />
      {check.text && (
        <section className="mt-4 rounded-2xl border border-line bg-raised p-5">
          <h2 className="font-display text-2xl">Uložený text</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{check.text}</p>
        </section>
      )}
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => {
            if (!family) {
              void navigate({ to: "/rodina", search: { kod: "" } });
              return;
            }
            pushAlert({ checkId: check.id, verdict: check.verdict, type: check.type });
            setSent(
              family.viewAs === "chraneny"
                ? "Strážca vidí verdikt a typ, nie celý text."
                : "Upozornenie je v rodine. Strážca nevidí text, pokiaľ to člen nepovolil.",
            );
          }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface font-semibold"
        >
          <Users className="size-4" />
          Upozorniť rodinu
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface font-semibold"
        >
          <Share2 className="size-4" />
          Zdieľať varovanie
        </button>
      </div>
      {sent && <p className="mt-3 text-sm text-muted">{sent}</p>}
      <form
        className="mt-6 rounded-2xl border border-line p-4"
        onSubmit={(event) => {
          event.preventDefault();
          addReport({
            id: crypto.randomUUID(),
            at: Date.now(),
            checkId: check.id,
            note: note.trim() || "Verdikt nesedí.",
          });
          setNote("");
          setSent("Hlásenie je uložené v profile. Pomôže doladiť verdikty.");
        }}
      >
        <label className="block text-sm text-muted">
          Verdikt je zlý?
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Čo nesedí? Nemusíš písať čísla kariet."
            className="mt-2 min-h-20 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg"
          />
        </label>
        <button
          type="submit"
          className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brass"
        >
          <Flag className="size-4" />
          Poslať hlásenie
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          deleteCheck(check.id);
          void navigate({ to: "/historia" });
        }}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-danger"
      >
        <Trash2 className="size-4" />
        Zmazať túto kontrolu
      </button>
    </AppShell>
  );
}
