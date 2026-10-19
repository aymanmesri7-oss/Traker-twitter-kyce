export type VaStatus = "actif" | "inactif" | "formation" | "suspendu" | "parti";
export type AccountStatus = "actif" | "routine" | "abandonné" | "banni" | "supprimé";
export type EventType = "story_posted" | "reel_posted" | "views_checked" | "branding_checked" | "account_deleted";

export const LIVE_STATUSES: AccountStatus[] = ["actif", "routine"];
export const VA_STATUSES: VaStatus[] = ["actif", "inactif", "formation", "suspendu", "parti"];
export const ACCOUNT_STATUSES: AccountStatus[] = ["actif", "routine", "abandonné", "banni", "supprimé"];
export const IDENTITIES = ["Identité 1", "Identité 2", "Identité 3", "Identité 4"];

export interface Va {
  id: string;
  discord_name: string;
  discord_id: string | null;
  status: VaStatus;
  identity: string | null;
  gms_link: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaOverview extends Va {
  live_count: number;
  total_accounts: number;
  last_account_at: string | null;
  last_event_at: string | null;
}

export interface Account {
  id: string;
  va_id: string;
  username: string;
  status: AccountStatus;
  identity: string | null;
  abandon_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountOverview extends Account {
  va_name: string;
  va_status: VaStatus;
  last_story_at: string | null;
  last_reel_at: string | null;
  last_views_at: string | null;
  last_views_count: number | null;
  last_event_at: string | null;
}

export interface CrmEvent {
  id: string;
  account_id: string;
  event_type: EventType;
  event_time: string;
  views_count: number | null;
  notes: string | null;
  created_at: string;
}

export interface Settings {
  story_duration_hours: number;
  reel_check_delay_minutes: number;
  min_views_threshold: number;
  routine_reel_interval_hours: number;
  inactivity_alert_hours: number;
  max_accounts_per_va: number;
}

export const DEFAULT_SETTINGS: Settings = {
  story_duration_hours: 24,
  reel_check_delay_minutes: 60,
  min_views_threshold: 100,
  routine_reel_interval_hours: 2,
  inactivity_alert_hours: 4,
  max_accounts_per_va: 3,
};

export function isLive(a: Pick<Account, "status">) {
  return LIVE_STATUSES.includes(a.status);
}
