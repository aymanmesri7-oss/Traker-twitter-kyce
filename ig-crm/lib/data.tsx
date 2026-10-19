"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "./supabase/client";
import { AccountOverview, DEFAULT_SETTINGS, LIVE_STATUSES, Settings, VaOverview } from "./types";
import { parisMidnight } from "./time";

interface CrmData {
  loading: boolean;
  settings: Settings;
  vas: VaOverview[];
  /** comptes vivants + derniers comptes morts (pour la vue globale) */
  accounts: AccountOverview[];
  today: { stories: number; reels: number };
  now: number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<CrmData | null>(null);

const REFRESH_MS = 60_000;
const TICK_MS = 20_000;
const DEAD_ACCOUNTS_LIMIT = 500;

export function parseSettings(rows: { key: string; value: string }[] | null): Settings {
  const s = { ...DEFAULT_SETTINGS };
  for (const r of rows ?? []) {
    if (r.key in s) {
      const n = Number(r.value);
      if (Number.isFinite(n)) (s as Record<string, number>)[r.key] = n;
    }
  }
  return s;
}

export function CrmDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<CrmData, "refresh" | "now">>({
    loading: true,
    settings: DEFAULT_SETTINGS,
    vas: [],
    accounts: [],
    today: { stories: 0, reels: 0 },
  });
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    const sb = supabaseBrowser();
    const midnight = parisMidnight().toISOString();
    const [settings, vas, live, dead, stories, reels] = await Promise.all([
      sb.from("settings").select("key,value"),
      sb.from("va_overview").select("*").order("discord_name"),
      sb.from("account_overview").select("*").in("status", LIVE_STATUSES).limit(1000),
      sb.from("account_overview").select("*").not("status", "in", `(${LIVE_STATUSES.join(",")})`)
        .order("updated_at", { ascending: false }).limit(DEAD_ACCOUNTS_LIMIT),
      sb.from("events").select("id", { count: "exact", head: true }).eq("event_type", "story_posted").gte("event_time", midnight),
      sb.from("events").select("id", { count: "exact", head: true }).eq("event_type", "reel_posted").gte("event_time", midnight),
    ]);
    setState({
      loading: false,
      settings: parseSettings(settings.data),
      vas: (vas.data ?? []) as VaOverview[],
      accounts: [...(live.data ?? []), ...(dead.data ?? [])] as AccountOverview[],
      today: { stories: stories.count ?? 0, reels: reels.count ?? 0 },
    });
    setNow(Date.now());
  }, []);

  useEffect(() => {
    refresh();
    const r = setInterval(refresh, REFRESH_MS);
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(r);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const value = useMemo(() => ({ ...state, now, refresh }), [state, now, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrm() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCrm hors CrmDataProvider");
  return v;
}
