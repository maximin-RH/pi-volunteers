// Calendar files (.ics) and "add to calendar" links for Google, Outlook and Apple.

export type CalEvent = {
  id: string;
  title: string;
  start: string; // ISO, UTC
  end: string;
  location?: string;
  description?: string;
  url?: string;
  tentative?: boolean;
};

/** Reminders built into calendar files: 1 day and 2 hours before. */
export const ICS_ALARM_HOURS = [24, 2];

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines over 75 octets must be folded (RFC 5545). */
function fold(line: string) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function toIcs(events: CalEvent[], opts: { name: string; alarms?: number[]; refreshHours?: number }) {
  const alarms = opts.alarms ?? ICS_ALARM_HOURS;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pi-Volunteers//Phillip Island//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + esc(opts.name),
    "X-WR-TIMEZONE:Australia/Melbourne",
    ...(opts.refreshHours ? ["REFRESH-INTERVAL;VALUE=DURATION:PT" + opts.refreshHours + "H", "X-PUBLISHED-TTL:PT" + opts.refreshHours + "H"] : []),
  ];
  const now = stamp(new Date().toISOString());
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + e.id + "@pi-volunteers.com",
      "DTSTAMP:" + now,
      "DTSTART:" + stamp(e.start),
      "DTEND:" + stamp(e.end),
      "SUMMARY:" + esc(e.title),
      ...(e.location ? ["LOCATION:" + esc(e.location)] : []),
      ...(e.description || e.url ? ["DESCRIPTION:" + esc([e.description, e.url].filter(Boolean).join("\n\n"))] : []),
      ...(e.url ? ["URL:" + e.url] : []),
      "STATUS:" + (e.tentative ? "TENTATIVE" : "CONFIRMED"),
      ...alarms.flatMap((h) => [
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(e.title), "TRIGGER:-PT" + h + "H", "END:VALARM",
      ]),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleLink(e: CalEvent) {
  const p = new URLSearchParams({
    action: "TEMPLATE", text: e.title, dates: stamp(e.start) + "/" + stamp(e.end),
    details: [e.description, e.url].filter(Boolean).join("\n\n"), location: e.location ?? "",
  });
  return "https://calendar.google.com/calendar/render?" + p;
}

/** host: outlook.live.com for personal accounts, outlook.office.com for work or school (Microsoft 365). */
export function outlookLink(e: CalEvent, host: "outlook.live.com" | "outlook.office.com") {
  const p = new URLSearchParams({
    path: "/calendar/action/compose", rru: "addevent", subject: e.title, startdt: e.start, enddt: e.end,
    body: [e.description, e.url].filter(Boolean).join("\n\n"), location: e.location ?? "",
  });
  return "https://" + host + "/calendar/0/deeplink/compose?" + p;
}

export const eventIcsPath = (id: string) => "/calendar/event/" + id + ".ics";

/** Subscription links: the calendar app fetches the feed itself and keeps it up to date. */
export function subscribeLinks(token: string, name: string) {
  const https = SITE() + "/calendar/feed/" + token + ".ics";
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    apple: webcal,
    google: "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(webcal),
    outlook: "https://outlook.live.com/calendar/0/addfromweb?" + new URLSearchParams({ url: https, name }),
    microsoft365: "https://outlook.office.com/calendar/0/addfromweb?" + new URLSearchParams({ url: https, name }),
  };
}

export const roleUrl = (id: string) => SITE() + "/roles/" + id;
