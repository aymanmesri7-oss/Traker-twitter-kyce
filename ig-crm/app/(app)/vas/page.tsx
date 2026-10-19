"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, GraduationCap, Instagram, Plus, Search, UserCheck, UserX, Users } from "lucide-react";
import { useCrm } from "@/lib/data";
import { VaOverview, VaStatus } from "@/lib/types";
import { ago, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { VaStatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Select, Skeleton, StatCard, StatGrid } from "@/components/ui/misc";
import { VaFormDialog } from "@/components/va-form";

type SortKey = "activity" | "accounts" | "name";
const FILTERS: { key: VaStatus | "tous"; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "actif", label: "Actifs" },
  { key: "formation", label: "Formation" },
  { key: "inactif", label: "Inactifs" },
  { key: "suspendu", label: "Suspendus" },
  { key: "parti", label: "Partis" },
];

function ts(iso: string | null) {
  return iso ? new Date(iso).getTime() : 0;
}

export default function VasPage() {
  const router = useRouter();
  const { vas, loading, settings, now } = useCrm();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<VaStatus | "tous">("actif");
  const [sort, setSort] = useState<SortKey>("activity");
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = vas.filter(
      (v) =>
        (status === "tous" || v.status === status) &&
        (!needle || v.discord_name.toLowerCase().includes(needle) || (v.discord_id ?? "").includes(needle))
    );
    const cmp: Record<SortKey, (a: VaOverview, b: VaOverview) => number> = {
      activity: (a, b) => ts(b.last_event_at) - ts(a.last_event_at),
      accounts: (a, b) => b.live_count - a.live_count,
      name: (a, b) => a.discord_name.localeCompare(b.discord_name),
    };
    return filtered.sort(cmp[sort]);
  }, [vas, q, status, sort]);

  const actifs = vas.filter((v) => v.status === "actif");
  const stats = {
    actifs: actifs.length,
    formation: vas.filter((v) => v.status === "formation").length,
    comptes: vas.reduce((n, v) => n + v.live_count, 0),
    sansCompte: actifs.filter((v) => v.live_count === 0).length,
  };

  return (
    <>
      <PageHeader
        title="Assistants virtuels"
        subtitle={`${vas.length} VA au total`}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Ajouter un VA
          </Button>
        }
      />

      <StatGrid>
        <StatCard label="VA actifs" value={stats.actifs} icon={UserCheck} tone="green" />
        <StatCard label="En formation" value={stats.formation} icon={GraduationCap} tone="blue" />
        <StatCard label="Comptes actifs" value={stats.comptes} icon={Instagram} tone="violet" />
        <StatCard label="VA sans compte" value={stats.sansCompte} icon={UserX} tone={stats.sansCompte ? "orange" : "green"} />
        <StatCard label="Total VA" value={vas.length} icon={Users} tone="pink" />
      </StatGrid>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="Rechercher un VA…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "h-9 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition",
                status === f.key ? "bg-white/[0.08] text-white" : "text-muted hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="lg:w-48">
          <option value="activity">Dernière activité</option>
          <option value="accounts">Nb de comptes</option>
          <option value="name">Nom</option>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={vas.length ? "Aucun VA ne correspond" : "Aucun VA pour l'instant"}
          text={vas.length ? "Modifie la recherche ou le filtre." : "Ajoute ton premier assistant pour commencer le suivi."}
          action={!vas.length && <Button variant="primary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Ajouter un VA</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const max = settings.max_accounts_per_va;
            return (
              <Link
                key={v.id}
                href={`/vas/${v.id}`}
                className="card group flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-semibold uppercase text-white ring-1 ring-line">
                      {v.discord_name.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{v.discord_name}</div>
                      <div className="truncate text-xs text-muted">{v.identity ?? "Identité non définie"}</div>
                    </div>
                  </div>
                  <VaStatusBadge status={v.status} />
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex gap-1">
                    {Array.from({ length: max }).map((_, i) => (
                      <span key={i} className={cn("h-2 w-6 rounded-full", i < v.live_count ? "bg-accent" : "bg-white/[0.07]")} />
                    ))}
                  </div>
                  <span className="text-xs tabular-nums text-muted">
                    <span className="font-medium text-white">{v.live_count}</span> / {max} comptes
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted">Dernier compte</dt>
                    <dd className="mt-0.5 text-white/90">{v.last_account_at ? formatDateTime(v.last_account_at) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Activité</dt>
                    <dd className="mt-0.5 text-white/90">{ago(v.last_event_at, now)}</dd>
                  </div>
                </dl>

                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  {v.gms_link ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(v.gms_link!, "_blank", "noopener");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-accent"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> GetMySocial
                    </button>
                  ) : (
                    <span className="text-xs text-muted/60">Pas de lien GMS</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-white/80 transition group-hover:text-white">
                    Voir détail <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <VaFormDialog open={adding} onOpenChange={setAdding} onCreated={(id) => router.push(`/vas/${id}`)} />
    </>
  );
}
