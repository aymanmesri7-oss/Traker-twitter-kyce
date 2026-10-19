import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function igUrl(username: string) {
  return `https://instagram.com/${username.replace(/^@/, "")}`;
}

export function cleanUsername(raw: string) {
  return raw.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
}

/** Traduit les erreurs Postgres/Supabase en message lisible. */
export function errorMessage(err: { message?: string; code?: string } | null | undefined) {
  if (!err) return "Erreur inconnue";
  if (err.code === "23505") return "Ce @username est déjà actif sur un autre compte.";
  const m = err.message ?? "";
  if (m.includes("MAX_ACCOUNTS")) return m.replace(/^.*MAX_ACCOUNTS:\s*/, "Limite atteinte : ");
  return m || "Erreur inconnue";
}
