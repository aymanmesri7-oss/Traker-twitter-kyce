import { cn } from "@/lib/utils";
import { AccountStatus, VaStatus } from "@/lib/types";

export type Tone = "green" | "red" | "orange" | "gray" | "violet" | "blue";

const tones: Record<Tone, string> = {
  green: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  red: "bg-red-500/10 text-red-400 ring-red-500/25",
  orange: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  gray: "bg-white/[0.04] text-muted ring-white/10",
  violet: "bg-accent-soft text-[#a99ffb] ring-accent/25",
  blue: "bg-sky-500/10 text-sky-400 ring-sky-500/20",
};

const dots: Record<Tone, string> = {
  green: "bg-emerald-400",
  red: "bg-red-400",
  orange: "bg-amber-400",
  gray: "bg-zinc-500",
  violet: "bg-[#a99ffb]",
  blue: "bg-sky-400",
};

export function Badge({ tone = "gray", dot = true, children, className }: { tone?: Tone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], className)}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

export const vaTone: Record<VaStatus, Tone> = {
  actif: "green",
  formation: "blue",
  inactif: "gray",
  suspendu: "orange",
  parti: "gray",
};

export const accountTone: Record<AccountStatus, Tone> = {
  actif: "violet",
  routine: "green",
  abandonné: "gray",
  banni: "red",
  supprimé: "gray",
};

export function VaStatusBadge({ status }: { status: VaStatus }) {
  return <Badge tone={vaTone[status]}>{status}</Badge>;
}

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={accountTone[status]}>{status}</Badge>;
}
