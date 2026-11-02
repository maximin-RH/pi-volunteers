import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOpportunity, REQ_LABELS } from "@/lib/queries";
import { fullDate, timeRange } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { InterestForm } from "./InterestForm";

type P = { params: Promise<{ id: string }> };

function imageUrl(path: string | null) {
  if (!path) return "/images/coast.jpg";
  return process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/role-images/" + path;
}

// Drives the Facebook / link preview card.
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await getOpportunity((await params).id);
  if (!o) return {};
  const desc = [fullDate(o.starts_at), timeRange(o.starts_at, o.ends_at), o.venue, o.suburb].filter(Boolean).join(" · ") + ". " + (o.people_needed - o.confirmed_count) + " people needed.";
  return { title: o.title, description: desc, openGraph: { title: o.title + " · " + o.org_name, description: desc, images: [imageUrl(o.image_path)] } };
}

export default async function Role({ params }: P) {
  const { id } = await params;
  const o = await getOpportunity(id);
  if (!o) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: existing }, { data: profile }] = user
    ? await Promise.all([
        supabase.from("interests").select("status").eq("opportunity_id", id).eq("volunteer_id", user.id).maybeSingle(),
        supabase.from("profiles").select("display_name,adult_confirmed").eq("id", user.id).single(),
      ])
    : [{ data: null }, { data: null }];

  const left = Math.max(0, o.people_needed - o.confirmed_count);

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-6 pb-16 flex flex-col gap-6">
      <Link href="/roles" className="font-bold no-underline">← All roles</Link>
      <div role="img" aria-label="" className="w-full h-[clamp(220px,32vw,400px)] rounded-hero bg-navy bg-cover bg-center" style={{ backgroundImage: "url(" + imageUrl(o.image_path) + ")" }} />
      <div className="flex flex-wrap gap-10 items-start">
        <article className="flex-[3_1_520px] min-w-0 flex flex-col gap-5">
          <Link href={"/orgs/" + o.org_slug} className="font-bold text-orange no-underline">{o.org_name}</Link>
          <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">{o.title}</h1>
          <p className="m-0 text-xl text-slate">
            {[fullDate(o.starts_at), timeRange(o.starts_at, o.ends_at), o.venue, o.suburb].filter(Boolean).join(" · ")}
          </p>
          {o.description && <p className="m-0 text-lg leading-relaxed max-w-[65ch] whitespace-pre-line">{o.description}</p>}
          {o.provides && <p className="m-0 text-lg"><strong>Provided:</strong> {o.provides}</p>}
          {o.requirements.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {o.requirements.map((r) => (
                <span key={r} className="px-3 py-1 rounded-full bg-sky-tint font-bold text-[15px]">{REQ_LABELS[r] ?? r}</span>
              ))}
            </div>
          )}
        </article>
        <aside className="flex-[2_1_340px] min-w-0 sticky top-24 rounded-panel bg-white border border-sand-line p-7 flex flex-col gap-4">
          <span className="text-2xl font-bold">{left ? left + " of " + o.people_needed + " spots left" : "This role is full"}</span>
          <InterestForm
            opportunityId={o.id}
            signedIn={!!user}
            adultConfirmed={!!profile?.adult_confirmed}
            defaultName={profile?.display_name ?? ""}
            email={user?.email ?? ""}
            phone={user?.phone ?? ""}
            status={existing?.status ?? null}
            full={!left}
          />
        </aside>
      </div>
    </div>
  );
}
