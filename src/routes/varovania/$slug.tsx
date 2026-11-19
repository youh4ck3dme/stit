import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shield-ui";
import { WARNINGS } from "@/lib/shield/engine";

export const Route = createFileRoute("/varovania/$slug")({ component: WarningPage });

function WarningPage() {
  const { slug } = Route.useParams();
  const item = WARNINGS.find((warning) => warning.slug === slug);
  if (!item) {
    return (
      <AppShell>
        <h1 className="font-display text-4xl">Varovanie sa nenašlo</h1>
        <Link to="/varovania" className="mt-3 inline-flex text-brass">
          Späť
        </Link>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <p className="text-sm text-brass">{item.flying ? "Podvod týždňa" : item.type}</p>
      <h1 className="mt-2 font-display text-4xl">{item.title}</h1>
      <p className="mt-3 text-muted">{item.summary}</p>
      <blockquote className="mt-5 rounded-2xl bg-surface px-4 py-3 text-sm">{item.example}</blockquote>
      <h2 className="mt-6 font-display text-2xl">Ako to spoznať</h2>
      <ul className="mt-2 space-y-2">
        {item.tells.map((tell) => (
          <li key={tell}>{tell}</li>
        ))}
      </ul>
      <h2 className="mt-6 font-display text-2xl">Čo spraviť</h2>
      <ul className="mt-2 space-y-2">
        {item.actions.map((action) => (
          <li key={action}>{action}</li>
        ))}
      </ul>
      <Link
        to="/kontrola"
        search={{ text: item.example, url: "", title: "", vzor: "" }}
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brass font-semibold text-ink"
      >
        Skontrolovať túto ukážku
      </Link>
    </AppShell>
  );
}
