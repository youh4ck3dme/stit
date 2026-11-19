import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shield-ui";
import { VERDICT_LABEL } from "@/lib/shield/engine";
import { useShield } from "@/lib/shield/store";

export const Route = createFileRoute("/historia/")({ component: HistoriaPage });

function HistoriaPage() {
  const checks = useShield((state) => state.checks);
  return (
    <AppShell>
      <h1 className="font-display text-4xl">História</h1>
      <p className="mt-2 text-muted">Verdikt a typ. Celý text len ak si ho v profile dovolil uložiť.</p>
      {checks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-raised p-5">
          <p>Zatiaľ nič. Prvá kontrola je na hlavnej obrazovke.</p>
          <Link
            to="/kontrola"
            search={{ text: "", url: "", title: "", vzor: "" }}
            className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-brass px-4 font-semibold text-ink"
          >
            Skontrolovať správu
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {checks.map((item) => (
            <li key={item.id}>
              <Link
                to="/historia/$id"
                params={{ id: item.id }}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-raised px-4 py-3"
              >
                <span>
                  <span
                    className={`block text-sm font-semibold ${
                      item.verdict === "podvod"
                        ? "text-danger"
                        : item.verdict === "podozrive"
                          ? "text-warn"
                          : "text-safe"
                    }`}
                  >
                    {VERDICT_LABEL[item.verdict]} · {item.score}
                  </span>
                  <span className="block text-fg">{item.type}</span>
                  <span className="block text-xs text-faint">
                    {new Date(item.at).toLocaleString("sk-SK", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="text-faint">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
