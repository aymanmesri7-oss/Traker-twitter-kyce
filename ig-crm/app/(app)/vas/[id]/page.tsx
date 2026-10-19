"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, CalendarDays, CircleDashed, Clapperboard, ExternalLink, Eye, History, Instagram, Loader2, Pencil, Plus, ShieldCheck, Trash2, Fingerprint,
} from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useCrm } from "@/lib/data";
import { AccountOverview, CrmEvent, EventType, IDENTITIES, VA_STATUSES, VaStatus, isLive } from "@/lib/types";
import { createAccount, updateVa } from "@/lib/actions";
import { formatDate, formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AccountStatusBadge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Select, Skeleton } from "@/components/ui/misc";
import { AccountCard } from "@/components/account-card";
import { VaFormDialog } from "@/components/va-form";

type TimelineEvent = CrmEvent & { accounts: { username: string } };

const EVENT_META: Record<EventType, { label: string; icon: typeof Eye; cls: string }> = {
  story_posted: { label: "Story postée", icon: CircleDashed, cls: "text-pink-400 bg-pink-500/10" },
  reel_posted: { label: "Reel posté", icon: Clapperboard, cls: "text-accent bg-accent-soft" },
  views_checked: { label: "Vues vérifiées", icon: Eye, cls: "text-sky-400 bg-sky-500/10" },
  branding_checked: { label: "Branding vérifié", icon: ShieldCheck, cls: "text-emerald-400 bg-emerald-500/10" },
  account_deleted: { label: "Compte retiré", icon: Trash2, cls: "text-red-400 bg-red-500/10" },
};

const statusDot: Record<VaStatus, string> = {
  actif: "bg-emerald-400",
  formation: "bg-sky-400",
  inactif: "bg-zinc-500",
  suspendu: "bg-amber-400",
  parti: "bg-zinc-600",
};

export default function VaDetailPage({ params }: { params: { id: string } }) {
  const { vas, accounts: globalAccounts, loading, settings, refresh } = useCrm();
  const va = vas.find((v) => v.id === params.id);

  const [accounts, setAccounts] = useState<AccountOverview[] | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newUser, setNewUser] = useState("");
  const [newIdentity, setNewIdentity] = useState("");
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState("");

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [acc, ev] = await Promise.all([
      sb.from("account_overview").select("*").eq("va_id", params.id).order("created_at", { ascending: false }),
      sb.from("events").select("*, accounts!inner(username, va_id)").eq("accounts.va_id", params.id).order("event_time", { ascending: false }).limit(80),
    ]);
    setAccounts((acc.data ?? []) as AccountOverview[]);
    setEvents((ev.data ?? []) as TimelineEvent[]);
  }, [params.id]);

  // recharge à chaque rafraîchissement global (actions, intervalle 60s)
  useEffect(() => {
    load();
  }, [load, globalAccounts]);

  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    setHash(h);
    if (h && accounts) document.getElementById(h)?.scrollIntoView({ behavior: "smooth", block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts !== null]);

  const live = useMemo(() => (accounts ?? []).filter(isLive), [accounts]);
  const dead = useMemo(() => (accounts ?? []).filter((a) => !isLive(a)), [accounts]);
  const full = live.length >= settings.max_accounts_per_va;

  if (loading || accounts === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!va) {
    return (
      <EmptyState icon={Instagram} title="VA introuvable" action={<Link href="/vas"><Button>Retour aux VA</Button></Link>} />
    );
  }

  async function changeStatus(status: VaStatus) {
    const { error } = await updateVa(va!.id, { status });
    if (error) return toast.error(error);
    toast.success(`Statut : ${status}`);
    refresh();
  }

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await createAccount(va!.id, newUser, newIdentity || va!.identity);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(`@${newUser.replace(/^@/, "")} ajouté`);
    setAdding(false);
    setNewUser("");
    await refresh();
  }

  return (
    <>
      <Link href="/vas" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Tous les VA
      </Link>

      {/* En-tête VA */}
      <div className="card mb-8 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-accent/25 via-accent/5 to-transparent" />
        <div className="-mt-10 px-5 pb-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 text-xl font-semibold uppercase text-white ring-4 ring-surface">
                {va.discord_name.slice(0, 2)}
              </span>
              <div className="pb-1">
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{va.discord_name}</h1>
                {va.discord_id && <div className="font-mono text-xs text-muted">{va.discord_id}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <span className={cn("pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full", statusDot[va.status])} />
                <Select value={va.status} onChange={(e) => changeStatus(e.target.value as VaStatus)} className="w-40 [&_select]:pl-7">
                  {VA_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>
              <Button size="icon" onClick={() => setEditing(true)} title="Modifier">
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-4 w-4 text-muted" />
              <div>
                <dt className="text-xs text-muted">Identité</dt>
                <dd className="text-white">{va.identity ?? "—"}</dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ExternalLink className="h-4 w-4 text-muted" />
              <div className="min-w-0">
                <dt className="text-xs text-muted">Lien GetMySocial</dt>
                <dd className="truncate">
                  {va.gms_link ? (
                    <a href={va.gms_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {va.gms_link.replace(/^https?:\/\//, "")}
                    </a>
                  ) : (
                    <span className="text-white">—</span>
                  )}
                </dd>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted" />
              <div>
                <dt className="text-xs text-muted">Arrivée</dt>
                <dd className="text-white">{formatDate(va.created_at)}</dd>
              </div>
            </div>
          </dl>
          {va.notes && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm text-white/80 ring-1 ring-line">{va.notes}</p>}
        </div>
      </div>

      {/* Comptes actifs */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-white">
            Comptes actifs
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-muted">
              {live.length}/{settings.max_accounts_per_va}
            </span>
          </h2>
          <Button size="sm" variant="primary" disabled={full} onClick={() => { setNewIdentity(va.identity ?? ""); setAdding(true); }} title={full ? "Limite de comptes atteinte" : undefined}>
            <Plus className="h-3.5 w-3.5" /> Nouveau compte
          </Button>
        </div>
        {live.length === 0 ? (
          <EmptyState icon={Instagram} title="Aucun compte actif" text="Ajoute le compte Instagram que ce VA vient de créer." />
        ) : (
          <div className="grid gap-3">
            {live.map((a) => (
              <AccountCard key={a.id} account={a} highlighted={hash === `acc-${a.id}`} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Historique */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <History className="h-4 w-4 text-muted" /> Historique des comptes
            <span className="ml-auto text-xs font-normal text-muted">{accounts.length} créés au total</span>
          </h2>
          {dead.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">Aucun compte supprimé pour l&apos;instant.</div>
          ) : (
            <div className="card divide-y divide-line">
              {dead.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white/90">@{a.username}</div>
                    <div className="text-xs text-muted">
                      {formatDateTime(a.updated_at)}
                      {a.abandon_reason && ` · ${a.abandon_reason}`}
                    </div>
                  </div>
                  <AccountStatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Timeline */}
        <section>
          <h2 className="mb-4 font-semibold text-white">Timeline</h2>
          {events.length === 0 ? (
            <div className="card p-6 text-center text-sm text-muted">Aucun événement.</div>
          ) : (
            <div className="card p-4">
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
                {events.map((e) => {
                  const m = EVENT_META[e.event_type];
                  const Icon = m.icon;
                  return (
                    <li key={e.id} className="relative flex gap-3">
                      <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-4 ring-surface", m.cls)}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <div className="text-sm text-white">
                          {m.label}
                          {e.views_count !== null && <span className="font-semibold tabular-nums"> · {e.views_count} vues</span>}
                        </div>
                        <div className="truncate text-xs text-muted">
                          @{e.accounts.username} · {formatDateTime(e.event_time)}
                          {e.notes && ` · ${e.notes}`}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>
      </div>

      <VaFormDialog open={editing} onOpenChange={setEditing} va={va} />

      <Dialog open={adding} onOpenChange={setAdding} title="Nouveau compte Instagram" description={`Pour ${va.discord_name}`}>
        <form onSubmit={submitAccount} className="space-y-4">
          <div>
            <label className="label">@username *</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">@</span>
              <input className="field pl-7" autoFocus autoCapitalize="none" autoCorrect="off" value={newUser} onChange={(e) => setNewUser(e.target.value)} placeholder="username" />
            </div>
          </div>
          <div>
            <label className="label">Identité</label>
            <Select value={newIdentity} onChange={(e) => setNewIdentity(e.target.value)}>
              <option value="">—</option>
              {IDENTITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={busy || !newUser.trim()}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter le compte
          </Button>
        </form>
      </Dialog>
    </>
  );
}
