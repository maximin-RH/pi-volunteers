import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentOrg } from "@/lib/org";
import { fullDate, timeRange } from "@/lib/format";
import { markAttendance, setInterestStatus } from "../actions";
import { ShareDialog } from "./ShareDialog";
import { MonthCalendar, monthParam } from "@/components/MonthCalendar";
import { SubscribePanel } from "@/components/SubscribePanel";
import { subscribeLinks } from "@/lib/calendar";
import { resetCalendarLink } from "@/app/me/actions";

export const metadata = { title: "Organisation dashboard" };

const TABS = [["live", "Live"], ["draft", "Draft"], ["closed", "Past"], ["calendar", "Calendar"]] as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ tab?: string; share?: string; month?: string }> }) {
  const sp = await searchParams;
  const { org } = await currentOrg();
  if (!org) redirect("/org/register");

  const supabase = await createClient();
  const [{ data: posts }, { data: ints }, { data: calToken }] = await Promise.all([
    supabase.from("opportunities").select("id,title,status,kind,starts_at,ends_at,people_needed,suburb,venue,provides,image_path,description").eq("org_id", org.id).order("starts_at", { ascending: false }),
    supabase.from("interests").select("id,status,display_name,shared_email,shared_phone,note,attended,opportunity_id,opportunities!inner(title,org_id)").eq("opportunities.org_id", org.id).order("created_at"),
    sp.tab === "calendar" ? supabase.rpc("my_calendar_token", { p_org: org.id }) : Promise.resolve({ data: null }),
  ]);

  const now = Date.now();
  const allPosts = (posts ?? []).map((p) => {
    const confirmedList = (ints ?? []).filter((i) => i.opportunity_id === p.id && i.status === "confirmed");
    const pending = (ints ?? []).filter((i) => i.opportunity_id === p.id && i.status === "interested").length;
    return {
      ...p,
      bucket: p.status === "live" && p.ends_at && new Date(p.ends_at).getTime() < now ? "closed" : p.status,
      confirmed: confirmedList.length,
      confirmedList,
      pending,
      // More people waiting than spots left, so the group has to choose.
      oversubscribed: pending > Math.max(0, p.people_needed - confirmedList.length),
      started: p.kind === "slot" && !!p.starts_at && new Date(p.starts_at).getTime() <= now,
    };
  });
  const oversubscribed = allPosts.filter((p) => p.bucket === "live" && p.oversubscribed);
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "live";
  const shown = allPosts.filter((p) => p.bucket === tab);
  const waiting = (ints ?? []).filter((i) => i.status === "interested");
  const sharePost = sp.share ? allPosts.find((p) => p.id === sp.share) : undefined;

  return (
    <div className="flex flex-col">
      <div className="mx-4 rounded-hero relative overflow-hidden bg-navy text-white">
        <img src="/images/sunset-pano.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_65%] opacity-35" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-9 flex flex-wrap gap-6 items-end justify-between">
          <div className="flex flex-col gap-2">
            <span className="font-bold text-amber">Organisation dashboard</span>
            <h1 className="m-0 text-[clamp(32px,4vw,48px)] leading-none font-bold tracking-tight">{org.name}</h1>
            <span className="text-sand">
              {org.status === "approved" ? "Approved" : "Waiting for approval. You can draft posts now."}
              {org.has_child_safe ? " · Child Safe evidence on file" : ""}
            </span>
          </div>
          <Link href="/org/posts/new" className="h-14 px-7 flex items-center rounded-full bg-orange hover:bg-orange-deep text-white hover:text-white text-lg font-bold no-underline">+ New post</Link>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-6 pt-7 pb-16 flex flex-wrap gap-7 items-start">
        <section className="flex-[2_1_560px] min-w-0 flex flex-col gap-3.5">
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <h2 className="m-0 text-[28px] font-bold tracking-tight">Your posts</h2>
            <nav className="flex gap-1 rounded-full bg-sand p-1">
              {TABS.map(([k, l]) => (
                <Link key={k} href={"?tab=" + k} className={"h-[38px] px-4 flex items-center rounded-full font-bold text-[15px] no-underline " + (tab === k ? "bg-white" : "")}>
                  {l}{k !== "calendar" && " (" + allPosts.filter((p) => p.bucket === k).length + ")"}
                </Link>
              ))}
            </nav>
          </div>
          {tab !== "calendar" && shown.length === 0 && <p className="m-0 p-6 rounded-card bg-cream text-lg text-slate">Nothing here yet.</p>}
          {shown.map((p) => (
            <div key={p.id} className="rounded-card bg-white border border-sand-line px-5 py-4.5 flex flex-wrap gap-4 items-center">
              <div className="flex-[1_1_260px] min-w-0 flex flex-col gap-1.5">
                <span className="text-[15px] text-slate">{fullDate(p.starts_at)} {timeRange(p.starts_at, p.ends_at) && "· " + timeRange(p.starts_at, p.ends_at)}</span>
                <span className="text-[19px] font-bold leading-tight">{p.title}</span>
                <div className="flex gap-2.5 items-center">
                  <div className="w-[140px] h-1.5 rounded bg-sand overflow-hidden"><div className="h-full bg-orange" style={{ width: Math.min(100, Math.round((p.confirmed / p.people_needed) * 100)) + "%" }} /></div>
                  <span className="text-[15px] text-slate">{p.confirmed} of {p.people_needed} confirmed</span>
                  {p.pending > 0 && <span className="px-2 py-0.5 rounded-full text-[13px] font-bold bg-peach text-rust">{p.pending} new</span>}
                </div>
                {p.bucket === "live" && p.oversubscribed && (
                  <span className="text-[15px] font-bold text-rust">
                    {p.pending} interested for {Math.max(0, p.people_needed - p.confirmed)} {p.people_needed - p.confirmed === 1 ? "spot" : "spots"} left
                  </span>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Link href={"/org/posts/new?edit=" + p.id} className="h-11 px-4 flex items-center rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] no-underline hover:border-navy">Edit</Link>
                <Link href={"/org/posts/new?clone=" + p.id} className="h-11 px-4 flex items-center rounded-full border-[1.5px] border-sand-line bg-white font-bold text-[15px] no-underline hover:border-navy">Clone</Link>
                {p.bucket === "live" && <Link href={"?share=" + p.id} className="h-11 px-4 flex items-center rounded-full bg-navy text-white hover:text-white font-bold text-[15px] no-underline">Share</Link>}
              </div>
              {p.started && p.confirmedList.length > 0 && (
                <div className="basis-full flex flex-col gap-2 pt-3 border-t border-sand-line">
                  <span className="text-[15px]"><strong>Who came?</strong> <span className="text-slate">Optional. Not shown on the site for now.</span></span>
                  {p.confirmedList.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-1.5">
                      <span className="flex-[1_1_140px] min-w-0 font-bold">{i.display_name}</span>
                      {([[true, "Attended"], [false, "Didn't come"]] as const).map(([value, text]) => {
                        const on = i.attended === value;
                        return (
                          <form key={text} action={markAttendance.bind(null, i.id, on ? null : value)}>
                            <button aria-pressed={on} className={"h-11 px-4 rounded-full border-[1.5px] font-bold text-[15px] " + (on ? "bg-navy border-navy text-white" : "bg-white border-sand-line hover:border-navy")}>
                              {text}
                            </button>
                          </form>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tab === "calendar" && (
            <>
              <MonthCalendar
                month={monthParam(sp.month)}
                monthHref={(m) => "?tab=calendar&month=" + m}
                items={allPosts.filter((p) => p.status === "live" && p.kind === "slot" && p.starts_at).map((p) => ({
                  id: p.id, title: p.title, start: p.starts_at!, end: p.ends_at, href: "/org/posts/new?edit=" + p.id,
                  tone: "org", sub: p.confirmed + " of " + p.people_needed + " confirmed",
                }))}
              />
              {calToken && (
                <SubscribePanel key={calToken as string} links={subscribeLinks(calToken as string, "Pi-Volunteers: " + org.name)}
                  what={org.name + "'s volunteer slots"} onReset={resetCalendarLink.bind(null, org.id)} />
              )}
            </>
          )}
        </section>

        <aside className="flex-[1_1_340px] min-w-0 flex flex-col gap-3.5">
          <h2 className="m-0 text-[28px] font-bold tracking-tight">Waiting for you <span className="text-orange">{waiting.length}</span></h2>
          {oversubscribed.length > 0 && (
            <div className="rounded-card bg-peach p-4.5 flex flex-col gap-1.5">
              <span className="font-bold text-rust">More people than spots on {oversubscribed.map((p) => p.title).join(", ")}</span>
              <span className="text-[15px]">You choose who to confirm. It's worth giving someone new a go, and letting the others know if you'd like them next time.</span>
            </div>
          )}
          {waiting.map((i) => (
            <div key={i.id} className="rounded-card bg-white border border-sand-line p-4.5 flex flex-col gap-2.5">
              <span className="text-lg font-bold">{i.display_name}</span>
              <span className="text-[15px] text-slate">{(i.opportunities as unknown as { title: string }).title}</span>
              <span className="text-[15px]">{[i.shared_email, i.shared_phone].filter(Boolean).join(" · ") || "No contact details shared"}</span>
              {i.note && <span className="text-[15px] italic">"{i.note}"</span>}
              <div className="flex gap-1.5">
                <form action={setInterestStatus.bind(null, i.id, "confirmed")} className="flex-1"><button className="w-full h-11 rounded-full bg-orange hover:bg-orange-deep text-white font-bold">Confirm</button></form>
                <form action={setInterestStatus.bind(null, i.id, "declined")}><button className="h-11 px-4 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Decline</button></form>
              </div>
            </div>
          ))}
          <p className="m-0 text-[15px] text-slate">You see only what each volunteer chose to share.</p>
        </aside>
      </div>

      {sharePost && (
        <ShareDialog
          post={{
            id: sharePost.id, title: sharePost.title, orgName: org.name, orgSlug: org.slug,
            when: [fullDate(sharePost.starts_at), timeRange(sharePost.starts_at, sharePost.ends_at)].filter(Boolean).join(", "),
            where: [sharePost.venue, sharePost.suburb].filter(Boolean).join(", "),
            peopleNeeded: sharePost.people_needed, description: sharePost.description,
          }}
        />
      )}
    </div>
  );
}
