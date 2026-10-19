export interface Va {
  id: string;
  discord_name: string;
  notes: string | null;
  created_at: string;
}

export interface VaOverview extends Va {
  live_count: number;
  last_account_at: string | null;
}

export interface Account {
  id: string;
  va_id: string;
  username: string;
  link: string | null;
  created_at: string;
}
