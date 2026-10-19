"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clapperboard, Eye, Loader2, Trash2, CircleDashed } from "lucide-react";
import { AccountOverview, AccountStatus, isLive } from "@/lib/types";
import { addEvent, closeAccount, setAccountStatus } from "@/lib/actions";
import { useCrm } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { TimeChoice, TimePicker, resolveTime } from "./time-picker";

type Mode = "story" | "reel" | "views" | "under" | "delete" | null;

export function AccountActions({ account, compact = false }: { account: AccountOverview; compact?: boolean }) {
  const { refresh, settings } = useCrm();
  const [mode, setMode] = useState<Mode>(null);
  const [time, setTime] = useState<TimeChoice>({ preset: 0 });
  const [views, setViews] = useState("");
  const [lastViews, setLastViews] = useState<number | null>(null);
  const [reason, setReason] = useState<"views" | "ban" | "other">("views");
  const [otherReason, setOtherReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isLive(account)) return null;

  const threshold = settings.min_views_threshold;
  const who = `@${account.username}`;

  function open(m: Mode) {
    setTime({ preset: 0 });
    setViews("");
    setReason("views");
    setOtherReason("");
    setMode(m);
  }

  async function run(fn: () => Promise<{ error: string | null }>, success: string) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error);
      return false;
    }
    toast.success(success);
    await refresh();
    return true;
  }

  async function submitEvent(type: "story_posted" | "reel_posted") {
    const at = resolveTime(time);
    if (!at) return toast.error("Date invalide");
    const ok = await run(() => addEvent(account.id, type, at), type === "story_posted" ? `Story enregistrée pour ${who}` : `Reel enregistré pour ${who}`);
    if (ok) setMode(null);
  }

  async function submitViews() {
    const n = Number(views);
    const at = resolveTime(time);
    if (!Number.isInteger(n) || n < 0) return toast.error("Nombre de vues invalide");
    if (!at) return toast.error("Date invalide");
    setBusy(true);
    const res = await addEvent(account.id, "views_checked", at, { views_count: n });
    if (!res.error && n >= threshold && account.status === "actif") {
      const r2 = await setAccountStatus(account.id, "routine");
      if (r2.error) res.error = r2.error;
    }
    setBusy(false);
    if (res.error) return toast.error(res.error);
    await refresh();
    if (n < threshold) {
      setLastViews(n);
      setMode("under");
    } else {
      toast.success(account.status === "actif" ? `${who} passe en routine (${n} vues)` : `${n} vues enregistrées`);
      setMode(null);
    }
  }

  async function submitDelete(forced?: { status: AccountStatus; reason: string }) {
    const map: Record<typeof reason, { status: AccountStatus; reason: string }> = {
      views: { status: "supprimé", reason: `moins de ${threshold} vues` },
      ban: { status: "banni", reason: "ban" },
      other: { status: "abandonné", reason: otherReason.trim() || "autre" },
    };
    const { status, reason: r } = forced ?? map[reason];
    const ok = await run(() => closeAccount(account.id, status, r), `${who} retiré (${r})`);
    if (ok) setMode(null);
  }

  const btn = (m: Mode, label: string, Icon: typeof Eye, variant: "secondary" | "danger" = "secondary", highlight = false) => (
    <Button
      size={compact ? "icon" : "sm"}
      variant={variant}
      onClick={() => open(m)}
      title={label}
      className={cn(compact && "h-8 w-8 rounded-lg", highlight && "border-amber-500/40 bg-amber-500/10 text-amber-300")}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && label}
    </Button>
  );

  const pendingViews =
    !!account.last_reel_at && (!account.last_views_at || new Date(account.last_views_at) < new Date(account.last_reel_at));

  return (
    <>
      <div className={cn("flex flex-wrap gap-1.5", compact && "flex-nowrap")}>
        {btn("story", "Story postée", CircleDashed)}
        {btn("reel", "Reel posté", Clapperboard)}
        {btn("views", "Vérifier vues", Eye, "secondary", pendingViews)}
        {btn("delete", "Supprimer", Trash2, "danger")}
      </div>

      <Dialog open={mode === "story" || mode === "reel"} onOpenChange={(o) => !o && setMode(null)} title={mode === "story" ? "Story postée" : "Reel posté"} description={who}>
        <TimePicker value={time} onChange={setTime} />
        <Button variant="primary" className="mt-6 w-full" disabled={busy} onClick={() => submitEvent(mode === "story" ? "story_posted" : "reel_posted")}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
        </Button>
      </Dialog>

      <Dialog open={mode === "views"} onOpenChange={(o) => !o && setMode(null)} title="Vérifier les vues" description={`${who} · seuil : ${threshold} vues`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitViews();
          }}
          className="space-y-5"
        >
          <div>
            <label className="label" htmlFor="views">Nombre de vues du dernier Reel</label>
            <input id="views" autoFocus inputMode="numeric" pattern="[0-9]*" className="field h-12 text-lg tabular-nums" value={views} onChange={(e) => setViews(e.target.value.replace(/\D/g, ""))} placeholder="0" />
            {views !== "" && (
              <p className={cn("mt-1.5 text-xs", Number(views) >= threshold ? "text-emerald-400" : "text-red-400")}>
                {Number(views) >= threshold ? "✓ Au-dessus du seuil → routine" : "✗ Sous le seuil → suppression proposée"}
              </p>
            )}
          </div>
          <TimePicker value={time} onChange={setTime} label="Vérifié quand ?" />
          <Button type="submit" variant="primary" className="w-full" disabled={busy || views === ""}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </Button>
        </form>
      </Dialog>

      <Dialog open={mode === "under"} onOpenChange={(o) => !o && setMode(null)} title="Sous le seuil" description={`${who} n'a fait que ${lastViews ?? 0} vues (seuil ${threshold}).`}>
        <p className="text-sm text-muted">Supprimer le compte maintenant ? Il restera dans l&apos;historique du VA.</p>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button onClick={() => setMode(null)}>Plus tard</Button>
          <Button variant="danger" disabled={busy} onClick={() => submitDelete({ status: "supprimé", reason: `moins de ${threshold} vues` })}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Supprimer
          </Button>
        </div>
      </Dialog>

      <Dialog open={mode === "delete"} onOpenChange={(o) => !o && setMode(null)} title="Supprimer le compte" description={who}>
        <span className="label">Raison</span>
        <div className="grid gap-2">
          {([
            ["views", `Moins de ${threshold} vues`],
            ["ban", "Banni par Instagram"],
            ["other", "Autre raison"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setReason(k)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm ring-1 ring-inset transition",
                reason === k ? "bg-accent-soft text-white ring-accent/50" : "bg-surface-2 text-muted ring-line hover:text-white"
              )}
            >
              <span className={cn("h-4 w-4 rounded-full ring-2 ring-inset", reason === k ? "bg-accent ring-accent shadow-[inset_0_0_0_3px_#111118]" : "ring-zinc-600")} />
              {l}
            </button>
          ))}
        </div>
        {reason === "other" && <input className="field mt-3 animate-fade-in" placeholder="Précise la raison…" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} autoFocus />}
        <Button variant="danger" className="mt-6 w-full" disabled={busy} onClick={() => submitDelete()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer la suppression
        </Button>
      </Dialog>
    </>
  );
}
