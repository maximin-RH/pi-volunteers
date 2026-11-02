import { eventIcsPath, googleLink, outlookLink, type CalEvent } from "@/lib/calendar";

const item = "min-h-11 px-4 flex items-center rounded-xl font-bold text-[15px] no-underline hover:bg-sand";

/** One event into the volunteer's own calendar. No JavaScript needed: a <details> menu. */
export function AddToCalendar({ e, compact }: { e: CalEvent; compact?: boolean }) {
  return (
    <details className="relative group">
      <summary className={"list-none cursor-pointer min-h-11 px-4 flex items-center gap-2 rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] hover:border-navy [&::-webkit-details-marker]:hidden " + (compact ? "" : "self-start")}>
        Add to calendar <span aria-hidden className="text-xs transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="absolute z-20 mt-1.5 right-0 w-[260px] rounded-card bg-white border border-sand-line shadow-[0_20px_50px_-20px_rgba(12,28,54,.45)] p-1.5 flex flex-col">
        <a href={eventIcsPath(e.id)} className={item}>Apple Calendar or Outlook app</a>
        <a href={googleLink(e)} target="_blank" rel="noopener" className={item}>Google Calendar</a>
        <a href={outlookLink(e, "outlook.live.com")} target="_blank" rel="noopener" className={item}>Outlook.com</a>
        <a href={outlookLink(e, "outlook.office.com")} target="_blank" rel="noopener" className={item}>Microsoft 365 (work or school)</a>
        <span className="px-4 py-2 text-sm text-slate">Apple and the Outlook app add reminders 1 day and 2 hours before. Google and Outlook online use your usual reminders.</span>
      </div>
    </details>
  );
}
