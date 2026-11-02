"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";

type Links = { https: string; apple: string; google: string; outlook: string; microsoft365: string };

const pill = "min-h-11 px-4 whitespace-nowrap rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] flex items-center justify-center no-underline hover:border-navy";

/** Subscribe once and the calendar app keeps itself up to date. The link is private to the owner. */
export function SubscribePanel({ links, what }: { links: Links; what: string }) {
  const [copied, setCopied] = useState<boolean | null>(null);
  return (
    <div className="h-full rounded-card bg-white border border-sand-line p-5 flex flex-col gap-3">
      <span className="text-lg font-bold">Keep {what} in your calendar</span>
      <span className="text-[15px] text-slate">Subscribe once. New and changed volunteer slots appear by themselves, usually within a few hours.</span>
      <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        <a href={links.apple} className={pill}>Apple Calendar</a>
        <a href={links.google} target="_blank" rel="noopener" className={pill}>Google Calendar</a>
        <a href={links.outlook} target="_blank" rel="noopener" className={pill}>Outlook.com</a>
        <a href={links.microsoft365} target="_blank" rel="noopener" className={pill}>Microsoft 365</a>
      </div>
      <div className="flex gap-2">
        <input readOnly value={links.https} aria-label="Calendar subscription link" onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 h-11 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[14px]" />
        <button onClick={async () => setCopied(await copyToClipboard(links.https))} className="shrink-0 h-11 px-4 rounded-full bg-navy hover:bg-navy-deep text-white font-bold text-[15px]">
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      {copied === false && <span role="alert" className="text-sm text-rust">Your browser blocked copying. Select the link and copy it by hand.</span>}
      <span className="text-sm text-slate">Keep this link to yourself: anyone with it can see these volunteer slots. Apple Calendar shows reminders 1 day and 2 hours before.</span>
    </div>
  );
}
