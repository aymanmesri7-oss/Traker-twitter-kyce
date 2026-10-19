"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, Clapperboard, Eye, Instagram, Repeat, Sparkles } from "lucide-react";
import { useCrm } from "@/lib/data";
import { ACCOUNT_STATUSES, AccountOverview, AccountStatus, IDENTITIES, isLive } from "@/lib/types";
import { accountTimers, AccountTimers } from "@/lib/compute";
import { HOUR, ago, formatDuration } from "@/lib/time";
import { cn, igUrl } from "@/lib/utils";
import { AccountStatusBadge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Select, Skeleton, StatCard, StatGrid } from "@/components/ui/misc";
import { AccountActions } from "@/components/account-actions";

type StatusFilter = AccountStatus | "vivants" | "tous";

function expiryCell(t: AccountTimers) {
  if (t.storyRemaining === null) return { text: "—", cls: "text-muted" };
  if (t.storyRemaining <= 0) return { text: "expirée", cls: "text-red-400 font-medium" };
  const cls = t.storyRemaining < 3 * HOUR ? "text-red-400 font-medium" : t.storyRemaining < 6 * HOUR ? "text-amber-400" : "text-emerald-400";
  return { text: formatDuration(t.storyRemaining), cls };
}

function viewsCell(a: AccountOverview, t: AccountTimers) {
  if (t.viewsOverdue) return { text: "à vérifier", cls: "text-red-400 font-medium" };
  if (t.viewsPending) return { text: "en attente", cls: "text-amber-400" };
  if (a.last_views_count === null) return { text: "—", cls: "text-muted" };
  return { text: String(a.last_views_count), cls: t.underThreshold ? "text-red-400 font-semibold" : "text-emerald-400" };
}

export default function ComptesPage() {
  const { accounts, vas, settings, now, loading } = useCrm();
  const [status, setStatus] = useState<StatusFilter>("vivants");
  const [vaId, setVaId] = useState("");
  const [identity, setIdentity] = useState("");

  const rows = useMemo(() => {
    return accounts
      .filter((a) =>
        status === "tous" ? true : status === "vivants" ? isLive(a) : a.status === status
      )
      .filter((a) => !vaId || a.va_id === vaId)
      .filter((a) => !identity || a.identity === identity)
      .map((a) => ({ a, t: accountTimers(a, settings, now) }))
      .sort((x, y) => {
        // vivants d'abord, puis échéance de story la plus proche
        const lx = isLive(x.a) ? 0 : 1;
        const ly = isLive(y.a) ? 0 : 1;
        if (lx !== ly) return lx - ly;
        return (x.t.storyRemaining ?? Infinity) - (y.t.storyRemaining ?? Infinity);
      });
  }, [accounts, status, vaId, identity, settings, now]);

  const live = accounts.filter(isLive);
  const timers = live.map((a) => accountTimers(a, settings, now));
  const stats = {
    actifs: live.filter((a) => a.status === "actif").length,
    routine: live.filter((a) => a.status === "routine").length,
    pending: timers.filter((t) => t.viewsPending).length,
    under: timers.filter((t) => t.underThreshold && !t.viewsPending).length,
    bannis: accounts.filter((a) => a.status === "banni").length,
  };

  return (
    <>
      <PageHeader title="Comptes Instagram" subtitle="Vue globale de tous les comptes" />

      <StatGrid>
        <StatCard label="Nouveaux (actif)" value={stats.actifs} icon={Sparkles} tone="violet" />
        <StatCard label="En routine" value={stats.routine} icon={Repeat} tone="green" />
        <StatCard label="Vues en attente" value={stats.pending} icon={Eye} tone="orange" />
        <StatCard label="Sous le seuil" value={stats.under} icon={Clapperboard} tone={stats.under ? "red" : "green"} />
        <StatCard label="Bannis (récents)" value={stats.bannis} icon={Ban} tone="red" />
      </StatGrid>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="vivants">Actifs + routine</option>
          <option value="tous">Tous les statuts</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select value={vaId} onChange={(e) => setVaId(e.target.value)}>
          <option value="">Tous les VA</option>
          {vas.map((v) => (
            <option key={v.id} value={v.id}>{v.discord_name}</option>
          ))}
        </Select>
        <Select value={identity} onChange={(e) => setIdentity(e.target.value)}>
          <option value="">Toutes les identités</option>
          {IDENTITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Instagram} title="Aucun compte" text="Les comptes s'ajoutent depuis la fiche d'un VA." />
      ) : (
        <>
          {/* Desktop : tableau */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  {["@username", "VA", "Statut", "Dernière story", "Expire dans", "Dernier Reel", "Vues", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ a, t }) => {
                  const exp = expiryCell(t);
                  const vw = viewsCell(a, t);
                  const liveRow = isLive(a);
                  return (
                    <tr key={a.id} className={cn("transition-colors hover:bg-white/[0.02]", !liveRow && "opacity-60")}>
                      <td className="px-4 py-3">
                        <a href={igUrl(a.username)} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:text-accent">@{a.username}</a>
                        {a.identity && <div className="text-xs text-muted">{a.identity}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/vas/${a.va_id}#acc-${a.id}`} className="text-white/80 hover:text-white">{a.va_name}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <AccountStatusBadge status={a.status} />
                      </td>
                      <td className="px-4 py-3 text-muted">{ago(a.last_story_at, now)}</td>
                      <td className={cn("px-4 py-3 tabular-nums", liveRow ? exp.cls : "text-muted")}>{liveRow ? exp.text : "—"}</td>
                      <td className="px-4 py-3 text-muted">{ago(a.last_reel_at, now)}</td>
                      <td className={cn("px-4 py-3 tabular-nums", vw.cls)}>{vw.text}</td>
                      <td className="px-4 py-3">
                        {liveRow ? <AccountActions account={a} compact /> : <span className="text-xs text-muted">{a.abandon_reason ?? "—"}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile : cartes */}
          <div className="grid gap-3 lg:hidden">
            {rows.map(({ a, t }) => {
              const exp = expiryCell(t);
              const vw = viewsCell(a, t);
              const liveRow = isLive(a);
              return (
                <div key={a.id} className={cn("card p-4", !liveRow && "opacity-60")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={igUrl(a.username)} target="_blank" rel="noopener noreferrer" className="font-medium text-white">@{a.username}</a>
                      <Link href={`/vas/${a.va_id}#acc-${a.id}`} className="block truncate text-xs text-muted">{a.va_name}{a.identity && ` · ${a.identity}`}</Link>
                    </div>
                    <AccountStatusBadge status={a.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted">Story expire</div>
                      <div className={cn("mt-0.5 tabular-nums", liveRow ? exp.cls : "text-muted")}>{liveRow ? exp.text : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted">Dernier Reel</div>
                      <div className="mt-0.5 text-white/80">{ago(a.last_reel_at, now).replace("il y a ", "")}</div>
                    </div>
                    <div>
                      <div className="text-muted">Vues</div>
                      <div className={cn("mt-0.5 tabular-nums", vw.cls)}>{vw.text}</div>
                    </div>
                  </div>
                  {liveRow && (
                    <div className="mt-3 border-t border-line pt-3">
                      <AccountActions account={a} compact />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
