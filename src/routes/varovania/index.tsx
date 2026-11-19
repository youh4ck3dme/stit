import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shield-ui";
import { WARNINGS } from "@/lib/shield/engine";
import { useShield } from "@/lib/shield/store";

export const Route = createFileRoute("/varovania/")({ component: VarovaniaPage });

function VarovaniaPage() {
  const checks = useShield((state) => state.checks);
  const hot = new Set(checks.map((item) => item.type));
  return (
    <AppShell>
      <h1 className="font-display text-4xl">Varovania</h1>
      <p className="mt-2 text-muted">Čo práve chodieva po Slovensku a ako to spoznať skôr, než klikneš.</p>
      <ul className="mt-6 space-y-3">
        {WARNINGS.map((item) => {
          const flying = item.flying || hot.has(item.type);
          return (
            <li key={item.slug}>
              <Link
                to="/varovania/$slug"
                params={{ slug: item.slug }}
                className="block rounded-2xl border border-line bg-raised p-4"
              >
                <span className="flex items-center gap-2 text-xs text-brass">
                  {flying ? "Práve letí" : item.type}
                </span>
                <span className="mt-1 block font-display text-2xl">{item.title}</span>
                <span className="mt-1 block text-sm text-muted">{item.summary}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
