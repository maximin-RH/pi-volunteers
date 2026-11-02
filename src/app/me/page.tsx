import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fullDate, timeRange } from "@/lib/format";
import { roleUrl, subscribeLinks, type CalEvent } from "@/lib/calendar";
import { withdrawInterest } from "@/app/roles/[id]/actions";
import { ContactDetails, type Contacts } from "@/components/ContactDetails";
import { AddToCalendar } from "@/components/AddToCalendar";
import { MonthCalendar, monthParam } from "@/components/MonthCalendar";
import { SubscribePanel } from "@/components/SubscribePanel";
import { ReminderPrefs } from "./ReminderPrefs";
import { DeleteAccount } from "./DeleteAccount";
import { resetCalendarLink } from "./actions";

export const metadata = { title: "My volunteering" };

const STATUS: Record<string, { label: string; cls: string }> = {
  interested: { label: "Waiting for the group", cls: "bg-peach text-rust" },
  confirmed: { label: "Confirmed", cls: "bg-sky-tint text-navy" },
  declined: { label: "Not this time", cls: "bg-sand text-slate" },
  withdrawn: { label: "Withdrawn", cls: "bg-sand text-slate" },
};

export default async function Me({ searchParams }: { searchParams: Promise<{ view?: string; month?: string }> }) {
  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "list";
  const month = monthParam(sp.month);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/me");

  const [{ data: rows }, { data: prefs }, { data: token }] = await Promise.all([
    supabase
      .from("interests")
      .select("status, opportunity:opportunities(id,title,kind,starts_at,ends_at,venue,suburb,description,org:organisations(name),contacts:opportunity_contacts(contact_name,contact_email,contact_phone,onsite_same,onsite_name,onsite_phone))")
      .eq("volunteer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("reminder_email,reminder_sms,reminder_phone").eq("id", user.id).single(),
    supabase.rpc("my_calendar_token"),
  ]);

  type Row = {
    status: string;
    opportunity: {
      id: string; title: string; kind: string; starts_at: string | null; ends_at: string | null; venue: string | null; suburb: string | null;
      description: string | null; org: { name: string }; contacts: Contacts | null;
    };
  };
  const list = (rows ?? []) as unknown as Row[];
  const now = Date.now();
  const active = list.filter((r) => ["interested", "confirmed"].includes(r.status));
  const upcoming = active.filter((r) => !r.opportunity.starts_at || new Date(r.opportunity.starts_at).getTime() > now);
  const past = list.filter((r) => !upcoming.includes(r));

  async function signOut() {
    "use server";
    const s = await createClient();
    await s.auth.signOut();
    redirect("/");
  }

  const tab = (v: string, label: string) => (
    <Link href={v === "list" ? "/me" : "/me?view=" + v} className={"h-[38px] px-4 flex items-center rounded-full font-bold text-[15px] no-underline " + (view === v ? "bg-white" : "")}>{label}</Link>
  );

  return (
    <div className="mx-auto max-w-[1000px] px-6 pt-10 pb-16 flex flex-col gap-8">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-bold text-orange">My volunteering</span>
          <h1 className="m-0 text-[clamp(36px,4.5vw,52px)] leading-none font-bold tracking-tight">Coming up</h1>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <nav className="flex gap-1 rounded-full bg-sand p-1">{tab("list", "List")}{tab("calendar", "Calendar")}</nav>
          <form action={signOut}><button className="h-11 px-5 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Sign out</button></form>
        </div>
      </div>

      {view === "calendar" ? (
        <MonthCalendar
          month={month}
          monthHref={(m) => "/me?view=calendar&month=" + m}
          items={active.filter((r) => r.opportunity.starts_at).map((r) => ({
            id: r.opportunity.id, title: r.opportunity.title, start: r.opportunity.starts_at!, end: r.opportunity.ends_at,
            href: "/roles/" + r.opportunity.id, tone: r.status === "confirmed" ? "confirmed" : "tentative", sub: r.opportunity.org.name,
          }))}
        />
      ) : (
        <>
          {upcoming.length === 0 && (
            <p className="m-0 rounded-card bg-cream p-6 text-lg">Nothing booked yet. <Link href="/roles">Find a role</Link> that suits your week.</p>
          )}
          <div className="flex flex-col gap-3">
            {upcoming.map((r) => <Item key={r.opportunity.id} r={r} withdraw={withdrawInterest.bind(null, r.opportunity.id)} />)}
          </div>
          {past.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="m-0 text-2xl font-bold">Past and closed</h2>
              {past.map((r) => <Item key={r.opportunity.id} r={r} />)}
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-2xl font-bold">Calendar, reminders and account</h2>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))]">
          {token && (
            <SubscribePanel key={token as string} links={subscribeLinks(token as string, "Pi-Volunteers")} what="your volunteering"
              onReset={resetCalendarLink.bind(null, null)} />
          )}
          <ReminderPrefs
            // Remount after saving so the form shows what was saved.
            key={[prefs?.reminder_email, prefs?.reminder_sms, prefs?.reminder_phone].join("|")}
            email={user.email ?? null}
            init={{ email: prefs?.reminder_email ?? true, sms: prefs?.reminder_sms ?? false, phone: prefs?.reminder_phone ?? user.phone ?? "" }}
          />
        </div>
        <DeleteAccount />
      </section>
    </div>
  );

  function Item({ r, withdraw }: { r: Row; withdraw?: () => Promise<void> }) {
    const s = STATUS[r.status];
    const o = r.opportunity;
    const cal: CalEvent | null = o.starts_at && o.ends_at
      ? { id: o.id, title: o.title + " · " + o.org.name, start: o.starts_at, end: o.ends_at, location: [o.venue, o.suburb, "Phillip Island VIC"].filter(Boolean).join(", "), description: o.description ?? undefined, url: roleUrl(o.id) }
      : null;
    return (
      <div className="rounded-card bg-white border border-sand-line p-5 flex flex-wrap gap-4 items-center">
        <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-1">
          <span className={"self-start px-2.5 py-0.5 rounded-full text-[13px] font-bold " + s.cls}>{s.label}</span>
          <Link href={"/roles/" + o.id} className="text-lg font-bold no-underline">{o.title}</Link>
          <span className="text-[15px] text-slate">
            {[o.org.name, fullDate(o.starts_at), timeRange(o.starts_at, o.ends_at), o.suburb].filter(Boolean).join(" · ")}
          </span>
          {withdraw && o.contacts && <div className="pt-2"><ContactDetails c={o.contacts} compact /></div>}
        </div>
        {withdraw && (
          <div className="flex gap-1.5 flex-wrap">
            {cal && <AddToCalendar e={cal} compact />}
            <form action={withdraw}><button className="h-11 px-4 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Can't make it</button></form>
          </div>
        )}
      </div>
    );
  }
}
