"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clapperboard, CircleDashed, Eye, Loader2, Repeat, RotateCcw, Timer, Users } from "lucide-react";
import { useCrm } from "@/lib/data";
import { saveSettings } from "@/lib/actions";
import { DEFAULT_SETTINGS, Settings } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/misc";

const FIELDS: { key: keyof Settings; label: string; help: string; unit: string; icon: typeof Eye; min: number; max: number }[] = [
  { key: "story_duration_hours", label: "Durée d'une story", help: "Temps avant expiration d'une story.", unit: "h", icon: CircleDashed, min: 1, max: 72 },
  { key: "reel_check_delay_minutes", label: "Délai avant check des vues", help: "Après un Reel, quand vérifier les vues.", unit: "min", icon: Timer, min: 5, max: 600 },
  { key: "min_views_threshold", label: "Seuil minimum de vues", help: "En dessous, le compte est à supprimer.", unit: "vues", icon: Eye, min: 1, max: 100000 },
  { key: "routine_reel_interval_hours", label: "Intervalle entre Reels (routine)", help: "Alerte si dépassé de +30min.", unit: "h", icon: Repeat, min: 1, max: 24 },
  { key: "inactivity_alert_hours", label: "Seuil d'inactivité VA", help: "Alerte si aucun événement depuis.", unit: "h", icon: Clapperboard, min: 1, max: 72 },
  { key: "max_accounts_per_va", label: "Comptes actifs max par VA", help: "Bloque l'ajout au-delà.", unit: "comptes", icon: Users, min: 1, max: 20 },
];

export default function SettingsPage() {
  const { settings, loading, refresh } = useCrm();
  const [form, setForm] = useState<Record<keyof Settings, string>>(() => toForm(settings));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading) setForm(toForm(settings));
  }, [loading, settings]);

  const dirty = FIELDS.some((f) => Number(form[f.key]) !== settings[f.key]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = { ...settings };
    for (const f of FIELDS) {
      const n = Number(form[f.key]);
      if (!Number.isFinite(n) || n < f.min || n > f.max) return toast.error(`${f.label} : entre ${f.min} et ${f.max}`);
      next[f.key] = n;
    }
    setBusy(true);
    const { error } = await saveSettings(next);
    setBusy(false);
    if (error) return toast.error(error);
    toast.success("Paramètres enregistrés");
    refresh();
  }

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Règles de calcul des échéances et alertes" />

      {loading ? (
        <Skeleton className="h-96" />
      ) : (
        <form onSubmit={submit} className="max-w-2xl">
          <div className="card divide-y divide-line">
            {FIELDS.map(({ key, label, help, unit, icon: Icon, min, max }) => (
              <div key={key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <label htmlFor={key} className="text-sm font-medium text-white">{label}</label>
                    <p className="text-xs text-muted">
                      {help} Défaut : {DEFAULT_SETTINGS[key]} {unit}.
                    </p>
                  </div>
                </div>
                <div className="relative w-full sm:w-40">
                  <input
                    id={key}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    className="field pr-16 text-right tabular-nums"
                    value={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setForm(toForm(DEFAULT_SETTINGS))}>
              <RotateCcw className="h-4 w-4" /> Valeurs par défaut
            </Button>
            <Button type="submit" variant="primary" disabled={busy || !dirty}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

function toForm(s: Settings) {
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [k, String(v)])) as Record<keyof Settings, string>;
}
