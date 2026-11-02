"use client";

import { useActionState, useState } from "react";
import { saveReminderPrefs, type PrefsState } from "./actions";
import { SMS_ENABLED } from "@/lib/features";

const check = "min-h-11 flex items-center gap-3 cursor-pointer";

export function ReminderPrefs({ email, init }: { email: string | null; init: { email: boolean; sms: boolean; phone: string } }) {
  const [state, action, pending] = useActionState<PrefsState, FormData>(saveReminderPrefs, {});
  const [sms, setSms] = useState(init.sms);

  return (
    <form action={action} className="h-full rounded-card bg-white border border-sand-line p-5 flex flex-col gap-2">
      <span className="text-lg font-bold">Reminders</span>
      <span className="text-[15px] text-slate">
        {SMS_ENABLED ? "Groups choose when to remind confirmed volunteers. You choose how." : "Groups choose when to remind confirmed volunteers by email. You can turn this off."}
      </span>
      <label className={check}>
        <input type="checkbox" name="reminderEmail" defaultChecked={init.email} disabled={!email} className="w-5 h-5 accent-navy" />
        <span>Email me{email ? <span className="text-slate"> at {email}</span> : <span className="text-slate"> (sign in with email to use this)</span>}</span>
      </label>
      {SMS_ENABLED && (
        <label className={check}>
          <input type="checkbox" name="reminderSms" checked={sms} onChange={(e) => setSms(e.target.checked)} className="w-5 h-5 accent-navy" />
          Text me
        </label>
      )}
      {SMS_ENABLED && sms && (
        <label className="flex flex-col gap-1.5 font-bold max-w-[280px]">
          Mobile for reminders
          <input name="reminderPhone" type="tel" defaultValue={init.phone} placeholder="e.g. 0412 345 678" autoComplete="tel"
            className="h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal" />
          <span className="text-sm font-normal text-slate">Only used for reminders. Groups don't see it.</span>
        </label>
      )}
      {!(SMS_ENABLED && sms) && <input type="hidden" name="reminderPhone" value={init.phone} />}
      {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
      {state.ok && !pending && <p className="m-0 text-navy font-bold">Saved.</p>}
      {/* mt-auto keeps the button on the card's bottom edge, level with the calendar card beside it. */}
      <button disabled={pending} className="self-start mt-auto h-11 px-5 rounded-full bg-navy hover:bg-navy-deep text-white font-bold disabled:opacity-60">
        {pending ? "Saving…" : "Save reminder settings"}
      </button>
    </form>
  );
}
