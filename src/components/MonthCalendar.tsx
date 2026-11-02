import Link from "next/link";
import { fullDate, timeRange } from "@/lib/format";

export type CalItem = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  href: string;
  tone: "confirmed" | "tentative" | "org";
  sub?: string;
};

const TZ = "Australia/Melbourne";
const ymd = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TONE: Record<CalItem["tone"], string> = {
  confirmed: "bg-navy text-white hover:text-white",
  tentative: "bg-peach text-rust hover:text-rust",
  org: "bg-sky-tint text-navy",
};
const LEGEND: Record<CalItem["tone"], string> = { confirmed: "Confirmed", tentative: "Waiting for the group", org: "Your volunteer slots" };

/** "2026-11" for the current Melbourne month, or the requested one if valid. */
export function monthParam(m?: string) {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : ymd(new Date()).slice(0, 7);
}

function shift(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

/** Month grid (Monday first) with the month's events listed underneath for small screens. */
export function MonthCalendar({ items, month, monthHref }: { items: CalItem[]; month: string; monthHref: (m: string) => string }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const today = ymd(new Date());
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= days ? month + "-" + String(day).padStart(2, "0") : null;
  });
  const inMonth = items.filter((e) => ymd(e.start).startsWith(month)).sort((a, b) => a.start.localeCompare(b.start));
  const byDay = new Map<string, CalItem[]>();
  inMonth.forEach((e) => byDay.set(ymd(e.start), [...(byDay.get(ymd(e.start)) ?? []), e]));
  const tones = [...new Set(items.map((e) => e.tone))];
  const label = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const nav = "min-h-11 px-4 flex items-center rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] no-underline hover:border-navy";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-2xl font-bold">{label}</h3>
        <div className="flex gap-1.5">
          <Link href={monthHref(shift(month, -1))} className={nav} aria-label="Previous month">←</Link>
          <Link href={monthHref(ymd(new Date()).slice(0, 7))} className={nav}>Today</Link>
          <Link href={monthHref(shift(month, 1))} className={nav} aria-label="Next month">→</Link>
        </div>
      </div>

      <div className="rounded-card border border-sand-line bg-white overflow-hidden">
        <div className="grid grid-cols-7 bg-sand text-center text-[13px] font-bold">
          {DOW.map((d) => <span key={d} className="py-2">{d}</span>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((key, i) => (
            <div key={i} className={"min-h-[clamp(56px,9vw,104px)] border-t border-l border-sand-line p-1 flex flex-col gap-1 " + (i % 7 === 0 ? "border-l-0 " : "") + (key ? "" : "bg-paper")}>
              {key && (
                <>
                  <span className={"self-end w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-bold " + (key === today ? "bg-orange text-white" : "text-slate")}>
                    {Number(key.slice(8))}
                  </span>
                  {(byDay.get(key) ?? []).map((e) => (
                    <Link key={e.id} href={e.href} title={e.title}
                      className={"block rounded-md px-1.5 py-0.5 text-[12px] leading-tight font-bold no-underline truncate " + TONE[e.tone]}>
                      <span className="hidden sm:inline">{timeRange(e.start, e.end).split("–")[0]} </span>{e.title}
                    </Link>
                  ))}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {tones.length > 1 && (
        <div className="flex flex-wrap gap-3 text-[14px]">
          {tones.map((t) => <span key={t} className="flex items-center gap-1.5"><span className={"w-3 h-3 rounded-sm " + TONE[t]} />{LEGEND[t]}</span>)}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {inMonth.length === 0 && <p className="m-0 p-5 rounded-card bg-cream text-slate">Nothing in {label}.</p>}
        {inMonth.map((e) => (
          <Link key={e.id} href={e.href} className="rounded-card bg-white border border-sand-line p-4 flex flex-wrap gap-x-4 gap-y-1 items-baseline no-underline hover:border-navy">
            <span className="font-bold min-w-[150px]">{fullDate(e.start)}, {timeRange(e.start, e.end)}</span>
            <span className="flex-1 min-w-[180px]">
              <span className="font-bold">{e.title}</span>
              {e.sub && <span className="text-slate"> · {e.sub}</span>}
            </span>
            {e.tone === "tentative" && <span className="px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-peach text-rust">Waiting for the group</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
