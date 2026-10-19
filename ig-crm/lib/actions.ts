import { supabaseBrowser } from "./supabase/client";
import { AccountStatus, EventType, Settings, Va } from "./types";
import { cleanUsername, errorMessage } from "./utils";

type Result = { error: string | null };

function wrap(res: { error: { message?: string; code?: string } | null }): Result {
  return { error: res.error ? errorMessage(res.error) : null };
}

export async function addEvent(accountId: string, type: EventType, at: Date, extra?: { views_count?: number; notes?: string }) {
  return wrap(
    await supabaseBrowser().from("events").insert({
      account_id: accountId,
      event_type: type,
      event_time: at.toISOString(),
      views_count: extra?.views_count ?? null,
      notes: extra?.notes ?? null,
    })
  );
}

export async function setAccountStatus(accountId: string, status: AccountStatus) {
  return wrap(await supabaseBrowser().from("accounts").update({ status }).eq("id", accountId));
}

export async function closeAccount(accountId: string, status: AccountStatus, reason: string) {
  const sb = supabaseBrowser();
  const res = await sb.from("accounts").update({ status, abandon_reason: reason }).eq("id", accountId);
  if (res.error) return wrap(res);
  await sb.from("events").insert({ account_id: accountId, event_type: "account_deleted", event_time: new Date().toISOString(), notes: reason });
  return { error: null };
}

export async function createAccount(vaId: string, username: string, identity: string | null) {
  const u = cleanUsername(username);
  if (!u) return { error: "Username requis" };
  return wrap(await supabaseBrowser().from("accounts").insert({ va_id: vaId, username: u, identity: identity || null }));
}

export async function createVa(v: Partial<Va>) {
  const res = await supabaseBrowser().from("vas").insert(v).select("id").single();
  return { ...wrap(res), id: (res.data?.id as string | undefined) ?? null };
}

export async function updateVa(id: string, v: Partial<Va>) {
  return wrap(await supabaseBrowser().from("vas").update(v).eq("id", id));
}

export async function deleteVa(id: string) {
  return wrap(await supabaseBrowser().from("vas").delete().eq("id", id));
}

export async function saveSettings(s: Settings) {
  const rows = Object.entries(s).map(([key, value]) => ({ key, value: String(value) }));
  return wrap(await supabaseBrowser().from("settings").upsert(rows));
}
