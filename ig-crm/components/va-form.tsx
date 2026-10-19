"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { IDENTITIES, VA_STATUSES, Va, VaStatus } from "@/lib/types";
import { createVa, updateVa } from "@/lib/actions";
import { useCrm } from "@/lib/data";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Select } from "./ui/misc";

const EMPTY = { discord_name: "", discord_id: "", status: "actif" as VaStatus, identity: "", gms_link: "", notes: "" };

export function VaFormDialog({
  open,
  onOpenChange,
  va,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  va?: Va;
  onCreated?: (id: string) => void;
}) {
  const { refresh } = useCrm();
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(
      va
        ? { discord_name: va.discord_name, discord_id: va.discord_id ?? "", status: va.status, identity: va.identity ?? "", gms_link: va.gms_link ?? "", notes: va.notes ?? "" }
        : EMPTY
    );
  }, [open, va]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.discord_name.trim()) return toast.error("Le pseudo Discord est requis");
    setBusy(true);
    const payload = {
      discord_name: f.discord_name.trim(),
      discord_id: f.discord_id.trim() || null,
      status: f.status,
      identity: f.identity || null,
      gms_link: f.gms_link.trim() || null,
      notes: f.notes.trim() || null,
    };
    if (va) {
      const { error } = await updateVa(va.id, payload);
      setBusy(false);
      if (error) return toast.error(error);
      toast.success("VA mis à jour");
    } else {
      const { error, id } = await createVa(payload);
      setBusy(false);
      if (error) return toast.error(error);
      toast.success(`${payload.discord_name} ajouté`);
      if (id) onCreated?.(id);
    }
    await refresh();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={va ? "Modifier le VA" : "Ajouter un VA"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Pseudo Discord *</label>
            <input className="field" autoFocus value={f.discord_name} onChange={(e) => set("discord_name", e.target.value)} placeholder="ex. kevin_bj" />
          </div>
          <div>
            <label className="label">ID Discord</label>
            <input className="field" value={f.discord_id} onChange={(e) => set("discord_id", e.target.value)} placeholder="optionnel" />
          </div>
          <div>
            <label className="label">Statut</label>
            <Select value={f.status} onChange={(e) => set("status", e.target.value as VaStatus)}>
              {VA_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Identité</label>
            <Select value={f.identity} onChange={(e) => set("identity", e.target.value)}>
              <option value="">—</option>
              {IDENTITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Lien GetMySocial</label>
            <input className="field" type="url" value={f.gms_link} onChange={(e) => set("gms_link", e.target.value)} placeholder="https://gms.link/…" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="field h-24 resize-none py-2" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {va ? "Enregistrer" : "Ajouter le VA"}
        </Button>
      </form>
    </Dialog>
  );
}
