"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, CircleDashed, Clapperboard, Eye, Instagram, Trash2, UserCheck, Users, CheckCircle2, Hourglass } from "lucide-react";
import { useCrm } from "@/lib/data";
import { Alert, accountTimers, computeAlerts } from "@/lib/compute";
import { formatDuration, formatTime, parisMidnight } from "@/lib/time";
import { isLive } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeader, Skeleton, StatCard, StatGrid } from "@/components/ui/misc";

const KIND_ICON: Record<Alert["kind"], typeof Eye> = {
  story: CircleDashed,
  views: Eye,
  under: Trash2,
  reel: Clapperboard,
  va: Users,
};

function AlertRow({ alert }: { alert: Alert }) {
  const Icon = KIND_ICON[alert.kind];
  const urgent = alert.level === "urgent";
  return (
    <Link
      href={alert.href}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] sm:px-5"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          urgent ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{alert.title}</div>
        <div className="truncate text-xs text-muted">{alert.subtitle}</div>
      </div>
      {alert.when && (
        <span className={cn("shrink-0 text-xs font-medium tabular-nums", urgent ? "text-red-400" : "text-amber-400")}>{alert.when}</span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
    </Link>
  );
}

function AlertSection({ title, tone, alerts, empty }: { title: string; tone: "red" | "orange"; alerts: Alert[]; empty: string }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
        <span className={cn("relative flex h-2 w-2", tone === "red" ? "text-red-500" : "text-amber-400")}>
          {alerts.length > 0 && tone === "red" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", tone === "red" ? "bg-red-500" : "bg-amber-400")} />
        </span>
        {title}
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-medium tabular-nums text-muted">{alerts.length}</span>
      </h2>
      {alerts.length === 0 ? (
        <div className="card flex items-center gap-3 px-5 py-4 text-sm text-muted">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {empty}
        </div>
      ) : (
        <div className={cn("card divide-y divide-line overflow-hidden", tone === "red" && "border-red-500/20")}>
          {alerts.map((a) => (
            <AlertRow key={a.key} alert={a} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const { accounts, vas, settings, now, today, loading } = useCrm();

  const { urgent, attention } = useMemo(() => computeAlerts(accounts, vas, settings, now, formatDuration), [accounts, vas, settings, now]);

  const live = accounts.filter(isLive);
  const midnight = parisMidnight(new Date(now)).getTime();
  const vasToday = vas.filter((v) => v.last_event_at && new Date(v.last_event_at).getTime() >= midnight).length;
  const pending = live.filter((a) => accountTimers(a, settings, now).viewsPending).length;
  const routineOk = live.filter((a) => a.status === "routine" && !accountTimers(a, settings, now).reelLate).length;
  const vasOk = vas.filter((v) => v.status === "actif" && v.live_count > 0).length;

  return (
    <>
      <PageHeader
        title="Quoi faire maintenant"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Mis à jour à {formatTime(new Date(now))} · Paris
          </span>
        }
      />

      <StatGrid>
        <StatCard label="VA actifs aujourd'hui" value={loading ? "–" : vasToday} icon={UserCheck} tone="green" />
        <StatCard label="Comptes actifs" value={loading ? "–" : live.length} icon={Instagram} tone="violet" />
        <StatCard label="Stories aujourd'hui" value={loading ? "–" : today.stories} icon={CircleDashed} tone="pink" />
        <StatCard label="Reels aujourd'hui" value={loading ? "–" : today.reels} icon={Clapperboard} tone="blue" />
        <StatCard label="En attente de vérif." value={loading ? "–" : pending} icon={Hourglass} tone={pending ? "orange" : "green"} />
      </StatGrid>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-32" />
        </div>
      ) : (
        <>
          <AlertSection title="Urgent" tone="red" alerts={urgent} empty="Rien d'urgent. Tout est sous contrôle." />
          <AlertSection title="Attention" tone="orange" alerts={attention} empty="Aucun point d'attention." />

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> OK
            </h2>
            <div className="card grid grid-cols-2 divide-x divide-line">
              <div className="px-5 py-4">
                <div className="text-2xl font-semibold tabular-nums text-white">{vasOk}</div>
                <div className="text-xs text-muted">VA actifs avec au moins un compte</div>
              </div>
              <div className="px-5 py-4">
                <div className="text-2xl font-semibold tabular-nums text-white">{routineOk}</div>
                <div className="text-xs text-muted">Comptes en routine normale</div>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
