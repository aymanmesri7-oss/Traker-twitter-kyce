import { supabaseBrowser } from "./supabase/client";
import { errorMessage, usernameFromLink } from "./utils";

type Result = { error: string | null };

function wrap(res: { error: { message?: string; code?: string } | null }): Result {
  return { error: res.error ? errorMessage(res.error) : null };
}

export async function addVa(name: string) {
  return wrap(await supabaseBrowser().from("vas").insert({ discord_name: name.trim() }));
}

export async function setVaNote(id: string, notes: string) {
  return wrap(await supabaseBrowser().from("vas").update({ notes: notes.trim() || null }).eq("id", id));
}

export async function deleteVa(id: string) {
  return wrap(await supabaseBrowser().from("vas").delete().eq("id", id));
}

export async function addAccount(vaId: string, link: string): Promise<Result> {
  const username = usernameFromLink(link);
  if (!username) return { error: "Lien Instagram invalide" };
  return wrap(
    await supabaseBrowser().from("accounts").insert({ va_id: vaId, username, link: link.trim() })
  );
}

export async function deleteAccount(id: string) {
  return wrap(await supabaseBrowser().from("accounts").delete().eq("id", id));
}
