import { AccountOverview, Settings, VaOverview, isLive } from "./types";
import { HOUR, MIN } from "./time";

export interface AccountTimers {
  storyExpiresAt: number | null;
  /** ms restantes, négatif si expirée */
  storyRemaining: number | null;
  /** 0..1 du temps de vie de la story écoulé */
  storyProgress: number | null;
  /** dernier reel + délai de check */
  reelCheckAt: number | null;
  /** reel posté sans vues déclarées depuis */
  viewsPending: boolean;
  /** ... et le délai de check est dépassé */
  viewsOverdue: boolean;
  /** dernières vues déclarées < seuil */
  underThreshold: boolean;
  /** routine uniquement */
  nextReelAt: number | null;
  /** routine : pas de reel depuis intervalle + 30min */
  reelLate: boolean;
}

export function accountTimers(a: AccountOverview, s: Settings, now: number): AccountTimers {
  const storyAt = a.last_story_at ? new Date(a.last_story_at).getTime() : null;
  const reelAt = a.last_reel_at ? new Date(a.last_reel_at).getTime() : null;
  const viewsAt = a.last_views_at ? new Date(a.last_views_at).getTime() : null;
  const storyDur = s.story_duration_hours * HOUR;

  const storyExpiresAt = storyAt !== null ? storyAt + storyDur : null;
  const storyRemaining = storyExpiresAt !== null ? storyExpiresAt - now : null;
  const storyProgress = storyAt !== null ? Math.min(1, Math.max(0, (now - storyAt) / storyDur)) : null;

  const reelCheckAt = reelAt !== null ? reelAt + s.reel_check_delay_minutes * MIN : null;
  const viewsPending = reelAt !== null && (viewsAt === null || viewsAt < reelAt);
  const viewsOverdue = viewsPending && reelCheckAt !== null && now >= reelCheckAt;
  const underThreshold = a.last_views_count !== null && a.last_views_count < s.min_views_threshold;

  const interval = s.routine_reel_interval_hours * HOUR;
  const nextReelAt = a.status === "routine" && reelAt !== null ? reelAt + interval : null;
  const reelLate = a.status === "routine" && (reelAt === null || now - reelAt > interval + 30 * MIN);

  return { storyExpiresAt, storyRemaining, storyProgress, reelCheckAt, viewsPending, viewsOverdue, underThreshold, nextReelAt, reelLate };
}

export type Level = "urgent" | "attention";

export interface Alert {
  key: string;
  level: Level;
  kind: "story" | "views" | "under" | "reel" | "va";
  title: string;
  subtitle: string;
  /** texte de l'échéance, ex. "expire dans 1h20" */
  when: string;
  href: string;
  /** plus petit = plus prioritaire */
  sortValue: number;
}

export function computeAlerts(
  accounts: AccountOverview[],
  vas: VaOverview[],
  s: Settings,
  now: number,
  fmt: (ms: number) => string
) {
  const alerts: Alert[] = [];

  for (const a of accounts.filter(isLive)) {
    const t = accountTimers(a, s, now);
    const href = `/vas/${a.va_id}#acc-${a.id}`;
    const who = `@${a.username}`;
    const base = { subtitle: a.va_name, href };

    if (t.storyRemaining !== null) {
      if (t.storyRemaining <= 0) {
        alerts.push({ ...base, key: `story-${a.id}`, level: "urgent", kind: "story", title: `${who} · story expirée`, when: `depuis ${fmt(-t.storyRemaining)}`, sortValue: t.storyRemaining });
      } else if (t.storyRemaining < 3 * HOUR) {
        alerts.push({ ...base, key: `story-${a.id}`, level: "urgent", kind: "story", title: `${who} · story expire bientôt`, when: `dans ${fmt(t.storyRemaining)}`, sortValue: t.storyRemaining });
      } else if (t.storyRemaining < 6 * HOUR) {
        alerts.push({ ...base, key: `story-${a.id}`, level: "attention", kind: "story", title: `${who} · story à renouveler`, when: `dans ${fmt(t.storyRemaining)}`, sortValue: t.storyRemaining });
      }
    }
    if (t.viewsOverdue && t.reelCheckAt !== null) {
      alerts.push({ ...base, key: `views-${a.id}`, level: "urgent", kind: "views", title: `${who} · vues à déclarer`, when: `Reel il y a ${fmt(now - new Date(a.last_reel_at!).getTime())}`, sortValue: t.reelCheckAt - now });
    }
    if (t.underThreshold && !t.viewsPending) {
      alerts.push({ ...base, key: `under-${a.id}`, level: "urgent", kind: "under", title: `${who} · sous le seuil, à supprimer`, when: `${a.last_views_count} vues`, sortValue: -Infinity });
    }
    if (t.reelLate) {
      const reelAt = a.last_reel_at ? new Date(a.last_reel_at).getTime() : null;
      alerts.push({ ...base, key: `late-${a.id}`, level: "attention", kind: "reel", title: `${who} · pas de Reel récent`, when: reelAt ? `dernier il y a ${fmt(now - reelAt)}` : "aucun Reel", sortValue: reelAt ? reelAt - now : -1e12 });
    }
  }

  for (const v of vas) {
    if (v.status !== "actif") continue;
    if (v.live_count === 0) {
      alerts.push({ key: `noacc-${v.id}`, level: "attention", kind: "va", title: `${v.discord_name} · aucun compte actif`, subtitle: "VA actif", when: "", href: `/vas/${v.id}`, sortValue: 0 });
    } else if (!v.last_event_at || now - new Date(v.last_event_at).getTime() > s.inactivity_alert_hours * HOUR) {
      alerts.push({ key: `idle-${v.id}`, level: "attention", kind: "va", title: `${v.discord_name} · inactif`, subtitle: "Aucun événement récent", when: v.last_event_at ? `depuis ${fmt(now - new Date(v.last_event_at).getTime())}` : "jamais", href: `/vas/${v.id}`, sortValue: 0 });
    }
  }

  alerts.sort((x, y) => x.sortValue - y.sortValue);
  return {
    urgent: alerts.filter((a) => a.level === "urgent"),
    attention: alerts.filter((a) => a.level === "attention"),
  };
}
