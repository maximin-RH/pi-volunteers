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
  const guess = Date.parse(date + "T" + hhmm + ":00Z");
  const first = guess - melbourneOffsetMs(guess);
  // Re-check at the real instant in case daylight saving changes between the guess and the answer.
  return new Date(guess - melbourneOffsetMs(first)).toISOString();
}

/** Melbourne's offset from UTC at a moment, in ms. Independent of the server's own time zone. */
function melbourneOffsetMs(at: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const p = Object.fromEntries(parts.map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(at / 1000) * 1000;
}

/** Australian landline or mobile, with or without +61, spaces, brackets or dashes. */
export const phoneOk = (s: string) => /^\+?\d{8,12}$/.test(s.replace(/[\s()-]/g, ""));

/** E.164 for SMS: "0412 345 678" → "+61412345678". */
export function toE164(s: string) {
  const d = s.replace(/[\s()-]/g, "");
  if (d.startsWith("+")) return d;
  if (d.startsWith("61")) return "+" + d;
  if (d.startsWith("0")) return "+61" + d.slice(1);
  return "+61" + d;
}

export function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}
