"use client";

import { useActionState, useState } from "react";
import { savePost, type RegState } from "../../actions";
import { IMAGE_ACCEPT, MAX_IMAGE_MB, imageProblem, publicImage } from "@/lib/images";
import { SMS_ENABLED } from "@/lib/features";

export type PostInit = {
  id?: string; clonedFrom?: string; title?: string; category?: string; kind: "slot" | "ongoing";
  date?: string; start?: string; end?: string; peopleNeeded: number; venue?: string; suburb?: string;
  description?: string; provides?: string; requirements: string[]; imagePath?: string;
  contactName?: string; contactEmail?: string; contactPhone?: string;
  onsiteSame: boolean; onsiteName?: string; onsitePhone?: string; shareConsent: boolean;
  reminderHours: number[]; reminderChannels: string[];
};

export const REMINDER_HOURS: [number, string][] = [[168, "1 week before"], [48, "2 days before"], [24, "1 day before"], [2, "2 hours before"]];
const CHANNELS: [string, string][] = SMS_ENABLED ? [["email", "Email"], ["sms", "Text message"]] : [["email", "Email"]];

const input = "h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal w-full";
const label = "flex flex-col gap-1.5 font-bold min-w-0";

/** A checkbox styled as a pill, like the "Checks needed" choices. */
function Chip({ name, value, on, toggle, children }: { name: string; value: string; on: boolean; toggle: () => void; children: React.ReactNode }) {
  return (
    <label className={"min-h-11 px-3.5 flex items-center rounded-full border-[1.5px] font-bold text-[15px] cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-orange " + (on ? "bg-navy text-white border-navy" : "bg-white border-sand-strong")}>
      <input type="checkbox" name={name} value={value} checked={on} onChange={toggle} className="sr-only" />
      {children}
    </label>
  );
}

function fmt(date?: string, start?: string, end?: string) {
  if (!date) return "Date to be set";
  const d = new Date(date + "T00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const t = (s?: string) => { if (!s) return ""; let [h, m] = s.split(":").map(Number); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12; return h + (m ? ":" + String(m).padStart(2, "0") : "") + ap; };
  return d + (start && end ? ", " + t(start) + "–" + t(end) : "");
}

export function PostForm({ orgId, orgName, orgLogo, init, categories, suburbs, reqs }: {
  orgId: string; orgName: string; orgLogo: string | null; init: PostInit; categories: { slug: string; label: string }[]; suburbs: string[]; reqs: string[];
}) {
  const [state, action, pending] = useActionState<RegState, FormData>(savePost, {});
  const [f, setF] = useState(init);
  const set = (k: keyof PostInit) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  // The clicked button's name/value didn't reach the server action, so each button sets intent itself.
  const submitAs = (intent: "live" | "draft") => (fd: FormData) => { fd.set("intent", intent); action(fd); };
  const tick = (k: "onsiteSame" | "shareConsent") => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.checked });

  // Photo: a newly picked file, else the saved/cloned photo, else the org logo, else an Island photo.
  const [picked, setPicked] = useState<{ url?: string; error?: string }>({});
  const [fileKey, setFileKey] = useState(0);
  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPicked({});
    const problem = imageProblem(file);
    if (problem) { e.target.value = ""; return setPicked({ error: problem }); }
    setPicked({ url: URL.createObjectURL(file) });
  }
  function removePhoto() {
    setPicked({});
    setFileKey((k) => k + 1);
    setF({ ...f, imagePath: undefined });
  }
  const hasPhoto = !!(picked.url || f.imagePath);
  const preview = picked.url ?? (f.imagePath ? publicImage("role-images", f.imagePath) : orgLogo ?? "/images/coast.jpg");
  const previewIsLogo = !hasPhoto && !!orgLogo;

  return (
    <div className="flex flex-wrap gap-8 items-start">
      <form action={action} className="flex-[3_1_520px] min-w-0 flex flex-col gap-4 rounded-panel bg-white border border-sand-line p-7">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="id" value={f.id ?? ""} />
        <input type="hidden" name="clonedFrom" value={f.clonedFrom ?? ""} />
        <input type="hidden" name="kind" value={f.kind} />
        <input type="hidden" name="imagePath" value={f.imagePath ?? ""} />
        <label className={label}>What do you need help with?<input name="title" value={f.title ?? ""} onChange={set("title")} required placeholder="e.g. Carols setup crew, Sausage sizzle helpers" className={input} /></label>
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
        <div className="flex flex-col gap-1.5">
          <span className="font-bold">Event photo <span className="font-normal text-slate">(optional)</span></span>
          <div className="flex gap-4 items-center flex-wrap">
            <span className={"shrink-0 w-32 h-[67px] rounded-xl border-[1.5px] border-sand-line overflow-hidden " + (previewIsLogo ? "bg-white" : "bg-navy")}>
              <img src={preview} alt="" className={"w-full h-full " + (previewIsLogo ? "object-contain p-1.5" : "object-cover")} />
            </span>
            <div className="flex flex-col gap-1.5 min-w-0 flex-[1_1_240px]">
              <input key={fileKey} name="image" type="file" accept={IMAGE_ACCEPT} onChange={pickPhoto} className="text-[15px]" aria-label="Event photo" />
              <span className="text-sm text-slate">
                {hasPhoto ? "This photo shows on the role and in the preview when you share it." : orgLogo ? "No photo yet, so your logo will show instead." : "No photo yet, so an Island photo will show instead."}
                {" "}JPG, PNG or WebP, up to {MAX_IMAGE_MB} MB. Wide photos work best.
                {" "}Only use photos where everyone shown has agreed to appear, and no photos of children.
              </span>
              {picked.error && <span role="alert" className="text-sm text-rust">{picked.error}</span>}
              {hasPhoto && <button type="button" onClick={removePhoto} className="self-start min-h-11 px-4 rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] hover:border-navy">Remove photo</button>}
            </div>
          </div>
        </div>
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
        <fieldset className="flex flex-col gap-4 border-0 p-5 m-0 rounded-card bg-cream">
          <legend className="float-left font-bold text-lg">Contacts for volunteers</legend>
          <p className="clear-both m-0 text-[15px] text-slate">Only volunteers who register for this role see these details. They're never shown publicly.</p>
          <span className="font-bold">Point person for questions</span>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
            <label className={label}>Name<input name="contactName" value={f.contactName ?? ""} onChange={set("contactName")} autoComplete="off" className={input} /></label>
            <label className={label}>Email<input name="contactEmail" type="email" value={f.contactEmail ?? ""} onChange={set("contactEmail")} autoComplete="off" className={input} /></label>
            <label className={label}>Phone<input name="contactPhone" type="tel" value={f.contactPhone ?? ""} onChange={set("contactPhone")} autoComplete="off" placeholder="e.g. 0412 345 678" className={input} /></label>
          </div>
          <span className="text-sm text-slate -mt-2">Add an email, a phone number or both.</span>
          <span className="font-bold">Who volunteers meet on the day</span>
          <label className="min-h-11 flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="onsiteSame" checked={f.onsiteSame} onChange={tick("onsiteSame")} className="w-5 h-5 accent-navy" />
            Same as the point person
          </label>
          {!f.onsiteSame && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
              <label className={label}>Name<input name="onsiteName" value={f.onsiteName ?? ""} onChange={set("onsiteName")} autoComplete="off" className={input} /></label>
              <label className={label}>Phone on the day<input name="onsitePhone" type="tel" value={f.onsitePhone ?? ""} onChange={set("onsitePhone")} autoComplete="off" placeholder="e.g. 0412 345 678" className={input} /></label>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-sand-line">
            <input type="checkbox" name="shareConsent" checked={f.shareConsent} onChange={tick("shareConsent")} className="w-5 h-5 mt-0.5 shrink-0 accent-navy" />
            <span>I have permission from these people to share their names and contact details with volunteers who register for this role. <span className="text-slate">Needed to publish.</span></span>
          </label>
        </fieldset>
        {f.kind === "slot" && (
          <fieldset className="flex flex-col gap-3 border-0 p-0 m-0">
            <legend className="font-bold mb-1">Reminders to confirmed volunteers</legend>
            <div className="flex gap-1.5 flex-wrap">
              {REMINDER_HOURS.map(([h, text]) => (
                <Chip key={h} name="reminderHours" value={String(h)} on={f.reminderHours.includes(h)}
                  toggle={() => setF({ ...f, reminderHours: f.reminderHours.includes(h) ? f.reminderHours.filter((x) => x !== h) : [...f.reminderHours, h] })}>
                  {text}
                </Chip>
              ))}
            </div>
            {SMS_ENABLED ? (
              <div className="flex gap-1.5 flex-wrap items-center">
                <span className="text-[15px] font-bold mr-1">Send by</span>
                {CHANNELS.map(([c, text]) => (
                  <Chip key={c} name="reminderChannels" value={c} on={f.reminderChannels.includes(c)}
                    toggle={() => setF({ ...f, reminderChannels: f.reminderChannels.includes(c) ? f.reminderChannels.filter((x) => x !== c) : [...f.reminderChannels, c] })}>
                    {text}
                  </Chip>
                ))}
              </div>
            ) : (
              <input type="hidden" name="reminderChannels" value="email" />
            )}
            <span className="text-sm text-slate">
              {!f.reminderHours.length
                ? "No reminders will be sent."
                : (SMS_ENABLED ? "Sent automatically." : "Sent automatically by email.") +
                  " Each includes the date, time, meeting point and who to ask for on the day. Volunteers can turn reminders off."}
            </span>
          </fieldset>
        )}
        <p className="m-0 text-[15px] text-slate">All roles are 18+ at launch.</p>
        {state.error && <p role="alert" className="m-0 text-rust font-bold">{state.error}</p>}
        <div className="flex gap-2.5 flex-wrap pt-2 border-t border-sand-line">
          <button formAction={submitAs("live")} disabled={pending} className="h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold disabled:opacity-60">Publish</button>
          <button formAction={submitAs("draft")} disabled={pending} className="h-14 px-6 rounded-full border-[1.5px] border-sand-line bg-white text-[17px] font-bold hover:border-navy">Save draft</button>
        </div>
      </form>

      <aside className="flex-[2_1_360px] min-w-0 flex flex-col gap-3.5 sticky top-24">
        <span className="flex flex-col gap-0.5">
          <span className="font-bold text-slate">How it looks when shared</span>
          <span className="text-sm text-slate">Facebook, WhatsApp, text messages and most email apps show this preview.</span>
        </span>
        <div className="border border-[#DADDE1] rounded-[10px] overflow-hidden bg-white font-[system-ui]">
          <div className={"w-full aspect-[1.91/1] bg-center bg-no-repeat " + (previewIsLogo ? "bg-white bg-contain bg-origin-content p-6" : "bg-navy bg-cover")} style={{ backgroundImage: "url(" + preview + ")" }} />
          <div className="px-3.5 py-2.5 bg-[#F0F2F5] flex flex-col gap-0.5">
            <span className="text-xs text-[#65676B] uppercase">{(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/^https?:\/\//, "") || "your-domain"}</span>
            <span className="text-base font-bold text-[#050505] leading-tight">{(f.title || "What you need help with") + " · " + orgName}</span>
            <span className="text-sm text-[#65676B]">{fmt(f.date, f.start, f.end)}{f.venue ? " · " + f.venue : ""}{f.suburb ? " · " + f.suburb : ""}. {f.peopleNeeded} {Number(f.peopleNeeded) === 1 ? "person" : "people"} needed.</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
