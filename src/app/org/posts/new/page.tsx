import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentOrg } from "@/lib/org";
import { listCategories, listSuburbs, REQ_LABELS } from "@/lib/queries";
import { publicImage } from "@/lib/images";
import { PostForm, type PostInit } from "./PostForm";

export const metadata = { title: "New post" };

const TZ = "Australia/Melbourne";
const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);

/** Same weekday, ~1 year later, never in the past. */
function nextYear(iso: string) {
  const d = new Date(iso);
  do d.setDate(d.getDate() + 364); while (d.getTime() < Date.now());
  return d;
}

export default async function NewPost({ searchParams }: { searchParams: Promise<{ edit?: string; clone?: string }> }) {
  const sp = await searchParams;
  const { org } = await currentOrg();
  if (!org) redirect("/org/register");

  const supabase = await createClient();
  const sourceId = sp.edit || sp.clone;
  const [cats, suburbs, { data: source }, { data: past }, { data: contacts }] = await Promise.all([
    listCategories(),
    listSuburbs(),
    sourceId ? supabase.from("opportunities").select("*").eq("id", sourceId).eq("org_id", org.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("opportunities").select("id,title,starts_at").eq("org_id", org.id).lt("starts_at", new Date().toISOString()).order("starts_at", { ascending: false }).limit(6),
    sourceId ? supabase.from("opportunity_contacts").select("*").eq("opportunity_id", sourceId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  // New posts start with the organisation's registered contact as the point person.
  let init: PostInit = {
    kind: "slot", peopleNeeded: 6, start: "09:00", end: "12:00", requirements: [],
    contactName: org.contact_name, contactEmail: org.contact_email, onsiteSame: true, shareConsent: false,
    reminderHours: [24], reminderChannels: ["email"],
  };
  if (source) {
    const s = source.starts_at ? (sp.clone ? nextYear(source.starts_at) : new Date(source.starts_at)) : null;
    const e = source.ends_at && s ? new Date(s.getTime() + (new Date(source.ends_at).getTime() - new Date(source.starts_at!).getTime())) : null;
    init = {
      id: sp.edit ? source.id : undefined,
      clonedFrom: sp.clone ? source.id : undefined,
      title: source.title, category: source.category, kind: source.kind,
      date: s ? ymd(s) : undefined, start: s ? hm(s) : undefined, end: e ? hm(e) : undefined,
      peopleNeeded: source.people_needed, venue: source.venue ?? "", suburb: source.suburb ?? "",
      description: source.description ?? "", provides: source.provides ?? "", requirements: source.requirements ?? [],
      imagePath: source.image_path ?? undefined,
      contactName: contacts?.contact_name ?? org.contact_name, contactEmail: contacts?.contact_email ?? org.contact_email,
      contactPhone: contacts?.contact_phone ?? "", onsiteSame: contacts?.onsite_same ?? true,
      onsiteName: contacts?.onsite_name ?? "", onsitePhone: contacts?.onsite_phone ?? "",
      // A copy from last year must be re-confirmed: the people or their permission may have changed.
      shareConsent: sp.edit ? !!contacts?.share_consent : false,
      reminderHours: source.reminder_hours ?? [24], reminderChannels: source.reminder_channels ?? ["email"],
    };
  }

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-6 pb-16 flex flex-col gap-5">
      <Link href="/org/dashboard" className="font-bold no-underline">← Dashboard</Link>
      <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-none font-bold tracking-tight">
        {sp.edit ? "Edit post" : sp.clone ? "New post from last year" : "New post"}
      </h1>
      {!sp.edit && (past ?? []).length > 0 && (
        <div className="flex flex-col gap-2.5 px-5 py-4.5 rounded-card bg-sand">
          <span className="font-bold">Start from last year</span>
          <div className="flex gap-2 flex-wrap">
            {past!.map((p) => (
              <Link key={p.id} href={"?clone=" + p.id}
                className={"min-h-11 px-4 py-1.5 flex items-center rounded-full border-[1.5px] font-bold text-[15px] no-underline " + (sp.clone === p.id ? "bg-navy text-white border-navy hover:text-white" : "bg-white border-sand-strong")}>
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}
      <PostForm key={sourceId ?? "new"} orgId={org.id} orgName={org.name} orgLogo={org.logo_path ? publicImage("org-logos", org.logo_path) : null} init={init} categories={cats} suburbs={suburbs} reqs={Object.keys(REQ_LABELS)} />
    </div>
  );
}
