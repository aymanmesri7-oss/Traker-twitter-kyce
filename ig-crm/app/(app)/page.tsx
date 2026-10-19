"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, ExternalLink, Instagram, Loader2, Plus, Search, StickyNote, Trash2, UserCheck, Users, UserX } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Account, VaOverview } from "@/lib/types";
import { addAccount, addVa, deleteAccount, deleteVa, setVaNote } from "@/lib/actions";
import { ago, formatDateTime } from "@/lib/time";
import { cn, igUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Skeleton, StatCard } from "@/components/ui/misc";

async function fetchAllAccounts() {
  const sb = supabaseBrowser();
  const all: Account[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from("accounts").select("id,va_id,username,link,created_at").eq("status", "actif").order("created_at", { ascending: false }).range(from, from + 999);
    all.push(...((data ?? []) as Account[]));
    if (!data || data.length < 1000) return all;
  }
}

export default function HomePage() {
  const [vas, setVas] = useState<VaOverview[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<VaOverview | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabaseBrowser().from("va_overview").select("id,discord_name,notes,created_at,live_count,last_account_at");
    setVas((data ?? []) as VaOverview[]);
    setAccounts(await fetchAllAccounts());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const byVa = useMemo(() => {
    const m = new Map<string, Account[]>();
    for (const a of accounts) m.set(a.va_id, [...(m.get(a.va_id) ?? []), a]);
    return m;
  }, [accounts]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (vas ?? [])
      .filter((v) => !needle || v.discord_name.toLowerCase().includes(needle) || (byVa.get(v.id) ?? []).some((a) => a.username.toLowerCase().includes(needle)))
      .sort((a, b) => b.live_count - a.live_count || a.discord_name.localeCompare(b.discord_name));
  }, [vas, q, byVa]);

  async function submitVa(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const { error } = await addVa(name);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(`${name.trim()} ajouté`);
    setName("");
    load();
  }

  async function confirmDeleteVa() {
    if (!toDelete) return;
    setBusy(true);
    const { error } = await deleteVa(toDelete.id);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success(`${toDelete.discord_name} supprimé`);
    setToDelete(null);
    load();
  }

  const total = vas?.length ?? 0;
  const working = (vas ?? []).filter((v) => v.live_count > 0).length;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="VA" value={vas ? total : "–"} icon={Users} tone="violet" />
        <StatCard label="Comptes Insta" value={vas ? accounts.length : "–"} icon={Instagram} tone="pink" />
        <StatCard label="VA avec comptes" value={vas ? working : "–"} icon={UserCheck} tone="green" />
        <StatCard label="VA sans compte" value={vas ? total - working : "–"} icon={UserX} tone="orange" />
      </div>

      <form onSubmit={submitVa} className="mb-3 flex gap-2">
        <input className="field h-11" placeholder="Nom du VA" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" variant="primary" className="h-11" disabled={busy || !name.trim()}>
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </form>

      {total > 5 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="field pl-9" placeholder="Rechercher un VA ou un compte…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {vas === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title={total ? "Aucun résultat" : "Aucun VA"} text={total ? undefined : "Tape le nom d'un VA ci-dessus pour commencer."} />
      ) : (
        <div className="space-y-2">
          {list.map((v) => (
            <VaRow
              key={v.id}
              va={v}
              accounts={byVa.get(v.id) ?? []}
              now={now}
              open={open === v.id}
              onToggle={() => setOpen(open === v.id ? null : v.id)}
              onDelete={() => setToDelete(v)}
              reload={load}
            />
          ))}
        </div>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)} title={`Supprimer ${toDelete?.discord_name ?? ""} ?`} description={`Ses ${toDelete?.live_count ?? 0} compte(s) Insta seront aussi supprimés.`}>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setToDelete(null)}>Annuler</Button>
          <Button variant="danger" disabled={busy} onClick={confirmDeleteVa}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function VaRow({
  va,
  accounts,
  now,
  open,
  onToggle,
  onDelete,
  reload,
}: {
  va: VaOverview;
  accounts: Account[];
  now: number;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
  reload: () => Promise<void>;
}) {
  const [link, setLink] = useState("");
  const [note, setNote] = useState(va.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setNote(va.notes ?? ""), [va.notes]);

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!link.trim()) return;
    setBusy(true);
    const { error } = await addAccount(va.id, link);
    setBusy(false);
    if (error) return toast.error(error);
    setLink("");
    reload();
  }

  async function saveNote() {
    if (note.trim() === (va.notes ?? "")) return;
    const { error } = await setVaNote(va.id, note);
    if (error) return toast.error(error);
    toast.success("Note enregistrée");
    reload();
  }

  // 1er clic arme le bouton, 2e clic supprime
  async function removeAccount(id: string) {
    if (armed !== id) {
      setArmed(id);
      clearTimeout(armTimer.current);
      armTimer.current = setTimeout(() => setArmed(null), 3000);
      return;
    }
    setArmed(null);
    const { error } = await deleteAccount(id);
    if (error) return toast.error(error);
    reload();
  }

  return (
    <div className={cn("card overflow-hidden transition-colors", open && "border-line-strong")}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted transition-transform duration-200", open && "rotate-90")} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-white">{va.discord_name}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                  va.live_count ? "bg-accent-soft text-[#a99ffb]" : "bg-white/[0.05] text-muted"
                )}
              >
                {va.live_count} compte{va.live_count > 1 ? "s" : ""}
              </span>
            </div>
            <div className="truncate text-xs text-muted">
              {va.notes ? (
                <span className="text-amber-300/90">{va.notes}</span>
              ) : accounts[0] ? (
                `Dernier compte ${ago(accounts[0].created_at, now)}`
              ) : (
                "Aucun compte"
              )}
            </div>
          </div>
        </button>
        <button onClick={onDelete} className="rounded-lg p-2 text-muted transition hover:bg-red-500/10 hover:text-red-400" title="Supprimer le VA">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="animate-fade-in space-y-3 border-t border-line bg-surface-2/50 px-4 py-4">
          <div className="relative">
            <StickyNote className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <textarea
              className="field h-auto min-h-[42px] resize-none py-2.5 pl-9"
              rows={1}
              placeholder="Note (ex. doit créer dans 24h)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
            />
          </div>

          <form onSubmit={submitLink} className="flex gap-2">
            <input className="field" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="Coller le lien Instagram" value={link} onChange={(e) => setLink(e.target.value)} />
            <Button type="submit" variant="primary" disabled={busy || !link.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ajouter
            </Button>
          </form>

          {accounts.length > 0 && (
            <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
              {accounts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <a href={a.link || igUrl(a.username)} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 flex-1 items-center gap-2">
                    <Instagram className="h-4 w-4 shrink-0 text-pink-400" />
                    <span className="truncate text-sm text-white group-hover:text-accent">@{a.username}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted opacity-0 transition group-hover:opacity-100" />
                  </a>
                  <span className="hidden shrink-0 text-xs text-muted sm:inline" title={formatDateTime(a.created_at)}>
                    {ago(a.created_at, now)}
                  </span>
                  <button
                    onClick={() => removeAccount(a.id)}
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                      armed === a.id ? "bg-red-500/15 text-red-400" : "text-muted hover:bg-red-500/10 hover:text-red-400"
                    )}
                    title="Supprimer le compte"
                  >
                    {armed === a.id ? "Confirmer ?" : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
