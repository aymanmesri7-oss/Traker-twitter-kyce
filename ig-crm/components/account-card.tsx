"use client";

import { Clapperboard, CircleDashed, Eye, ExternalLink } from "lucide-react";
import { AccountOverview } from "@/lib/types";
import { accountTimers } from "@/lib/compute";
import { useCrm } from "@/lib/data";
import { HOUR, ago, formatDuration, formatTime } from "@/lib/time";
import { cn, igUrl } from "@/lib/utils";
import { AccountStatusBadge } from "./ui/badge";
import { Progress } from "./ui/misc";
import { AccountActions } from "./account-actions";

export function AccountCard({ account: a, highlighted }: { account: AccountOverview; highlighted?: boolean }) {
  const { settings, now } = useCrm();
  const t = accountTimers(a, settings, now);

  const storyTone =
    t.storyRemaining === null ? "gray" : t.storyRemaining < 3 * HOUR ? "red" : t.storyRemaining < 6 * HOUR ? "orange" : "green";
  const storyText =
    t.storyRemaining === null
      ? "Aucune story"
      : t.storyRemaining <= 0
        ? `Expirée depuis ${formatDuration(-t.storyRemaining)}`
        : `Expire dans ${formatDuration(t.storyRemaining)}`;

  let reelText = "Aucun Reel";
  let reelTone: "red" | "orange" | "muted" | "green" = "muted";
  if (a.last_reel_at) {
    if (t.viewsOverdue) {
      reelText = "Check vues en retard";
      reelTone = "red";
    } else if (t.viewsPending && t.reelCheckAt) {
      reelText = `Check vues dans ${formatDuration(t.reelCheckAt - now)}`;
      reelTone = "orange";
    } else if (t.nextReelAt) {
      reelText = t.nextReelAt > now ? `Prochain Reel dans ${formatDuration(t.nextReelAt - now)}` : `Reel attendu depuis ${formatDuration(now - t.nextReelAt)}`;
      reelTone = t.reelLate ? "red" : t.nextReelAt > now ? "green" : "orange";
    } else {
      reelText = "Vues déclarées";
    }
  }
  const toneText = { red: "text-red-400", orange: "text-amber-400", green: "text-emerald-400", muted: "text-muted" };

  return (
    <div
      id={`acc-${a.id}`}
      className={cn(
        "card scroll-mt-24 p-4 transition-all duration-300 sm:p-5",
        highlighted && "border-accent/60 ring-4 ring-accent/15",
        t.underThreshold && !t.viewsPending && "border-red-500/40"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={igUrl(a.username)} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 font-medium text-white hover:text-accent">
            <span className="truncate">@{a.username}</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
          </a>
          <div className="mt-0.5 text-xs text-muted">
            {a.identity ?? "—"} · créé {ago(a.created_at, now)}
          </div>
        </div>
        <AccountStatusBadge status={a.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <CircleDashed className="h-3.5 w-3.5" /> Story
          </div>
          <div className="mt-1.5 text-sm text-white">{a.last_story_at ? `${ago(a.last_story_at, now)} (${formatTime(a.last_story_at)})` : "—"}</div>
          <div className={cn("mt-0.5 text-xs", { gray: "text-muted", red: "text-red-400", orange: "text-amber-400", green: "text-emerald-400" }[storyTone])}>{storyText}</div>
          {t.storyProgress !== null && (
            <div className="mt-2">
              <Progress value={1 - t.storyProgress} tone={storyTone} />
            </div>
          )}
        </div>

        <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <Clapperboard className="h-3.5 w-3.5" /> Dernier Reel
          </div>
          <div className="mt-1.5 text-sm text-white">{a.last_reel_at ? `${ago(a.last_reel_at, now)} (${formatTime(a.last_reel_at)})` : "—"}</div>
          <div className={cn("mt-0.5 text-xs", toneText[reelTone])}>{reelText}</div>
        </div>

        <div className="rounded-xl bg-surface-2 p-3 ring-1 ring-line">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            <Eye className="h-3.5 w-3.5" /> Vues
          </div>
          <div
            className={cn(
              "mt-1.5 text-lg font-semibold tabular-nums",
              a.last_views_count === null ? "text-muted" : t.underThreshold ? "text-red-400" : "text-emerald-400"
            )}
          >
            {a.last_views_count ?? "—"}
          </div>
          <div className="text-xs text-muted">{a.last_views_at ? ago(a.last_views_at, now) : `seuil ${settings.min_views_threshold}`}</div>
        </div>
      </div>

      <div className="mt-4">
        <AccountActions account={a} />
      </div>
    </div>
  );
}
