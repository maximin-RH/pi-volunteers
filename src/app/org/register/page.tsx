"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerOrg, type RegState } from "../actions";

const input = "h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal w-full";
const label = "flex flex-col gap-1.5 font-bold min-w-0";

const STEPS = [
  ["01", "We check your details", "ABN or incorporation number against the public register."],
  ["02", "An admin approves", "Usually within 48 hours. We email you either way."],
  ["03", "Post and share", "Your first post goes live and gets a Facebook-ready preview."],
];

export default function RegisterOrg() {
  const [state, action, pending] = useActionState<RegState, FormData>(registerOrg, {});

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-8 pb-16 grid gap-10 items-start grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-orange">For Island groups</span>
          <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">Register your group</h1>
          <p className="m-0 text-[19px] text-slate max-w-[52ch]">One form, about 3 minutes. An admin checks your details before your first post goes live.</p>
        </div>

        {state.ok ? (
          <div className="rounded-panel bg-navy text-white p-7 flex flex-col gap-3.5">
            <span className="font-bold text-amber">Submitted</span>
            <h2 className="m-0 text-3xl leading-tight">Thanks. We'll email you within 48 hours.</h2>
            <p className="m-0 text-sand">You can draft posts now. They go live once you're approved.</p>
            <Link href="/org/dashboard" className="self-start h-13 px-6 flex items-center rounded-full bg-orange hover:bg-orange-deep text-white hover:text-white font-bold no-underline">Open your dashboard</Link>
          </div>
        ) : (
          <form action={action} className="rounded-panel bg-white border border-sand-line p-7 flex flex-col gap-4">
            <label className={label}>Organisation name<input name="name" required className={input} /></label>
            <label className={label}>Type of group
              <select name="type" className={input}>
                <option value="incorporated_association">Incorporated association</option>
                <option value="registered_charity">Registered charity</option>
                <option value="club">Sporting or service club</option>
                <option value="school_or_council">School or council program</option>
                <option value="informal_group">Informal community group</option>
              </select>
            </label>
            <label className={label}>ABN or incorporation number
              <input name="abn" className={input} placeholder="11 digits, or A0012345B" />
              <span className="text-sm font-normal text-slate">Leave blank for informal groups. An admin will contact you.</span>
            </label>
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <label className={label}>Contact name<input name="contactName" required className={input} /></label>
              <label className={label}>Contact email<input name="contactEmail" type="email" required className={input} /></label>
            </div>
            <label className={label}>One line about your group<input name="about" maxLength={160} className={input} /></label>
            <label className={label}>Child Safe policy or code of conduct <span className="font-normal text-slate">(PDF, optional at launch)</span>
              <input name="childSafe" type="file" accept="application/pdf" className="text-[15px] font-normal" />
            </label>
            {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
            <button disabled={pending} className="self-start h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold disabled:opacity-60">
              {pending ? "Submitting…" : "Submit for approval"}
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative rounded-panel overflow-hidden aspect-[4/3]">
          <img src="/images/sunset-pano.jpg" alt="Western Port at sunset with surfers on the waves" className="absolute inset-0 w-full h-full object-cover object-[60%_50%]" />
        </div>
        {STEPS.map(([n, t, b]) => (
          <div key={n} className="flex gap-4 p-5 rounded-[20px] bg-white border border-sand-line">
            <span className="text-3xl font-bold text-orange tracking-tight leading-none">{n}</span>
            <span className="flex flex-col gap-1"><span className="text-lg font-bold">{t}</span><span className="text-slate">{b}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}
