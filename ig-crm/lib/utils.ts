import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "https://www.instagram.com/kevin.bj/?igsh=..." -> "kevin.bj" */
export function usernameFromLink(raw: string) {
  const s = raw.trim();
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i);
  const u = (m ? m[1] : s).replace(/^@+/, "");
  return /^[a-zA-Z0-9._]{1,30}$/.test(u) ? u : null;
}

export function igUrl(username: string) {
  return `https://instagram.com/${username}`;
}

/** Traduit les erreurs Postgres/Supabase en message lisible. */
export function errorMessage(err: { message?: string; code?: string } | null | undefined) {
  if (!err) return "Erreur inconnue";
  if (err.code === "23505") return "Ce compte Insta est déjà enregistré.";
  return err.message || "Erreur inconnue";
}
