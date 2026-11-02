import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fullDate, timeRange } from "@/lib/format";
import { withdrawInterest } from "@/app/roles/[id]/actions";

export const metadata = { title: "My volunteering" };

const STATUS: Record<string, { label: string; cls: string }> = {
  interested: { label: "Waiting for the group", cls: "bg-peach text-rust" },
  confirmed: { label: "Confirmed", cls: "bg-sky-tint text-navy" },
  declined: { label: "Not this time", cls: "bg-sand text-slate" },
  withdrawn: { label: "Withdrawn", cls: "bg-sand text-slate" },
};

export default async function Me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/me");

  const { data: rows } = await supabase
    .from("interests")
    .select("status, opportunity:opportunities(id,title,starts_at,ends_at,venue,suburb,org:organisations(name))")
    .eq("volunteer_id", user.id)
    .order("created_at", { ascending: false });

  type Row = { status: string; opportunity: { id: string; title: string; starts_at: string | null; ends_at: string | null; venue: string | null; suburb: string | null; org: { name: string } } };
  const list = (rows ?? []) as unknown as Row[];
  const now = Date.now();
  const upcoming = list.filter((r) => ["interested", "confirmed"].includes(r.status) && (!r.opportunity.starts_at || new Date(r.opportunity.starts_at).getTime() > now));
  const past = list.filter((r) => !upcoming.includes(r));

  async function signOut() {
    "use server";
    const s = await createClient();
    await s.auth.signOut();
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-[1000px] px-6 pt-10 pb-16 flex flex-col gap-8">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="flex flex-col gap-2">
          <span className="font-bold text-orange">My volunteering</span>
          <h1 className="m-0 text-[clamp(36px,4.5vw,52px)] leading-none font-bold tracking-tight">Coming up</h1>
        </div>
        <form action={signOut}><button className="h-11 px-5 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Sign out</button></form>
      </div>

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
    </div>
  );

  function Item({ r, withdraw }: { r: Row; withdraw?: () => Promise<void> }) {
    const s = STATUS[r.status];
    return (
      <div className="rounded-card bg-white border border-sand-line p-5 flex flex-wrap gap-4 items-center">
        <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-1">
          <span className={"self-start px-2.5 py-0.5 rounded-full text-[13px] font-bold " + s.cls}>{s.label}</span>
          <Link href={"/roles/" + r.opportunity.id} className="text-lg font-bold no-underline">{r.opportunity.title}</Link>
          <span className="text-[15px] text-slate">
            {[r.opportunity.org.name, fullDate(r.opportunity.starts_at), timeRange(r.opportunity.starts_at, r.opportunity.ends_at), r.opportunity.suburb].filter(Boolean).join(" · ")}
          </span>
        </div>
        {withdraw && (
          <form action={withdraw}><button className="h-11 px-4 rounded-full border-[1.5px] border-sand-line bg-white font-bold">Can't make it</button></form>
        )}
      </div>
    );
  }
}
