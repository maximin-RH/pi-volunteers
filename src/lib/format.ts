const TZ = "Australia/Melbourne";

export function dateParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-AU", { timeZone: TZ, ...o }).format(d);
  return { dow: f({ weekday: "short" }), day: f({ day: "numeric" }), mon: f({ month: "short" }) };
}

export function fullDate(iso: string | null) {
  if (!iso) return "Ongoing";
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
}

function time(iso: string) {
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .format(new Date(iso))
    .replace(" ", "")
    .replace(":00", "");
}

export function timeRange(start: string | null, end: string | null) {
  if (!start || !end) return "";
  return time(start) + "–" + time(end);
}

/** Combine a yyyy-mm-dd date and hh:mm time entered in Melbourne into an ISO string. */
export function melbourneToIso(date: string, hhmm: string) {
  const guess = new Date(date + "T" + hhmm + ":00Z");
  const local = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const offset = local.getTime() - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
