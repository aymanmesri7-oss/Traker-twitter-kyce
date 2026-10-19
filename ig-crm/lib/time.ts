export const TZ = "Europe/Paris";
export const MIN = 60_000;
export const HOUR = 60 * MIN;

function offsetMinutes(at: Date): number {
  const part =
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "shortOffset" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

function parisParts(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** Heure "murale" de Paris -> instant UTC. */
export function parisWallToUtc(y: number, mo: number, d: number, h = 0, mi = 0): Date {
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  let utc = naive - offsetMinutes(new Date(naive)) * MIN;
  utc = naive - offsetMinutes(new Date(utc)) * MIN;
  return new Date(utc);
}

export function parisMidnight(now = new Date()): Date {
  const p = parisParts(now);
  return parisWallToUtc(p.y, p.mo, p.d);
}

/** Valeur pour <input type="datetime-local"> en heure de Paris. */
export function toParisInputValue(at: Date): string {
  const p = parisParts(at);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

export function fromParisInputValue(v: string): Date | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return parisWallToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]);
}

export function formatTime(iso: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDateTime(iso: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDate(iso: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

/** Durée compacte : "45min", "2h05", "3j 4h". */
export function formatDuration(ms: number) {
  const totalMin = Math.floor(Math.abs(ms) / MIN);
  if (totalMin < 1) return "<1min";
  if (totalMin < 60) return `${totalMin}min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}j ${h % 24}h` : `${d}j`;
}

export function ago(iso: string | null | undefined, now: number) {
  if (!iso) return "—";
  return `il y a ${formatDuration(now - new Date(iso).getTime())}`;
}
