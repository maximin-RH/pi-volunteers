"use client";

import { useActionState, useState } from "react";
import { savePost, type RegState } from "../../actions";

export type PostInit = {
  id?: string; clonedFrom?: string; title?: string; category?: string; kind: "slot" | "ongoing";
  date?: string; start?: string; end?: string; peopleNeeded: number; venue?: string; suburb?: string;
  description?: string; provides?: string; requirements: string[];
};

const input = "h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal w-full";
const label = "flex flex-col gap-1.5 font-bold min-w-0";

function fmt(date?: string, start?: string, end?: string) {
  if (!date) return "Date to be set";
  const d = new Date(date + "T00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const t = (s?: string) => { if (!s) return ""; let [h, m] = s.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + (m ? ":" + String(m).padStart(2, "0") : "") + ap; };
  return d + (start && end ? ", " + t(start) + "–" + t(end) : "");
}

export function PostForm({ orgId, orgName, init, categories, suburbs, reqs }: {
  orgId: string; orgName: string; init: PostInit; categories: { slug: string; label: string }[]; suburbs: string[]; reqs: string[];
}) {
  const [state, action, pending] = useActionState<RegState, FormData>(savePost, {});
  const [f, setF] = useState(init);
  const set = (k: keyof PostInit) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="flex flex-wrap gap-8 items-start">
      <form action={action} className="flex-[3_1_520px] min-w-0 flex flex-col gap-4 rounded-panel bg-white border border-sand-line p-7">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="id" value={f.id ?? ""} />
        <input type="hidden" name="clonedFrom" value={f.clonedFrom ?? ""} />
        <input type="hidden" name="kind" value={f.kind} />
        <label className={label}>Role title<input name="title" value={f.title ?? ""} onChange={set("title")} required placeholder="e.g. Carols setup crew" className={input} /></label>
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <label className={label}>Category
            <select name="category" value={f.category ?? categories[0]?.slug} onChange={set("category")} className={input}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          </label>
          <div className={label}>Type
            <div className="flex gap-1 rounded-full bg-sand p-1">
              {([["slot", "Volunteer slot"], ["ongoing", "Ongoing"]] as const).map(([k, l]) => (
                <button type="button" key={k} onClick={() => setF({ ...f, kind: k })} className={"flex-1 h-10 rounded-full font-bold text-[15px] " + (f.kind === k ? "bg-white" : "")}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        {f.kind === "slot" && (
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
            <label className={label}>Date<input type="date" name="date" value={f.date ?? ""} onChange={set("date")} className={input} /></label>
            <label className={label}>Start<input type="time" name="start" value={f.start ?? ""} onChange={set("start")} className={input} /></label>
            <label className={label}>Finish<input type="time" name="end" value={f.end ?? ""} onChange={set("end")} className={input} /></label>
            <label className={label}>People needed<input type="number" min={1} name="peopleNeeded" value={f.peopleNeeded} onChange={set("peopleNeeded")} className={input} /></label>
          </div>
        )}
        {f.kind === "ongoing" && <label className={label}>People needed<input type="number" min={1} name="peopleNeeded" value={f.peopleNeeded} onChange={set("peopleNeeded")} className={input} /></label>}
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <label className={label}>Meeting point<input name="venue" value={f.venue ?? ""} onChange={set("venue")} className={input} /></label>
          <label className={label}>Suburb
            <select name="suburb" value={f.suburb ?? ""} onChange={set("suburb")} className={input}>
              <option value="">Choose…</option>
              {suburbs.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <label className={label}>What volunteers will do<textarea name="description" rows={4} value={f.description ?? ""} onChange={set("description")} className="rounded-xl border-[1.5px] border-sand-line px-3.5 py-3 text-[17px] font-normal" /></label>
        <label className={label}>What you provide<input name="provides" value={f.provides ?? ""} onChange={set("provides")} placeholder="e.g. Hi-vis, water, sausage sizzle" className={input} /></label>
        <fieldset className="flex flex-col gap-2 border-0 p-0 m-0">
          <legend className="font-bold mb-1">Checks needed</legend>
          <div className="flex gap-1.5 flex-wrap">
            {reqs.map((r) => {
              const on = f.requirements.includes(r);
              return (
                <label key={r} className={"min-h-10 px-3.5 flex items-center gap-2 rounded-full border-[1.5px] font-bold text-[15px] cursor-pointer " + (on ? "bg-navy text-white border-navy" : "bg-white border-sand-strong")}>
                  <input type="checkbox" name="requirements" value={r} checked={on} className="sr-only"
                    onChange={() => setF({ ...f, requirements: on ? f.requirements.filter((x) => x !== r) : [...f.requirements, r] })} />
                  {r}
                </label>
              );
            })}
          </div>
        </fieldset>
        <p className="m-0 text-[15px] text-slate">All roles are 18+ at launch.</p>
        {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
        <div className="flex gap-2.5 flex-wrap pt-2 border-t border-sand-line">
          <button name="intent" value="live" disabled={pending} className="h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold disabled:opacity-60">Publish</button>
          <button name="intent" value="draft" disabled={pending} className="h-14 px-6 rounded-full border-[1.5px] border-sand-line bg-white text-[17px] font-bold hover:border-navy">Save draft</button>
        </div>
      </form>

      <aside className="flex-[2_1_360px] min-w-0 flex flex-col gap-3.5 sticky top-24">
        <span className="font-bold text-slate">How it looks on Facebook</span>
        <div className="border border-[#DADDE1] rounded-[10px] overflow-hidden bg-white font-[system-ui]">
          <div className="w-full aspect-[1.91/1] bg-navy bg-cover bg-center" style={{ backgroundImage: "url(/images/coast.jpg)" }} />
          <div className="px-3.5 py-2.5 bg-[#F0F2F5] flex flex-col gap-0.5">
            <span className="text-xs text-[#65676B] uppercase">{(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "") || "your-domain"}</span>
            <span className="text-base font-bold text-[#050505] leading-tight">{(f.title || "Your role title") + " · " + orgName}</span>
            <span className="text-sm text-[#65676B]">{fmt(f.date, f.start, f.end)}{f.venue ? " · " + f.venue : ""}{f.suburb ? " · " + f.suburb : ""}. {f.peopleNeeded} people needed.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
