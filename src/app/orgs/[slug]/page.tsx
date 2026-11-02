import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleCard } from "@/components/RoleCard";
import type { Listing } from "@/lib/queries";
import { publicImage } from "@/lib/images";

export default async function Org({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: org } = await supabase.from("organisations").select("id,name,about,website,child_safe_doc_path,logo_path").eq("slug", slug).eq("status", "approved").maybeSingle();
  if (!org) notFound();
  const { data: opps } = await supabase.from("opportunity_listing").select("*").eq("org_id", org.id).order("starts_at");

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-10 pb-16 flex flex-col gap-6">
      <div className="flex items-center gap-5">
        {org.logo_path && <img src={publicImage("org-logos", org.logo_path)} alt={org.name + " logo"} className="w-20 h-20 shrink-0 rounded-card border border-sand-line bg-white object-contain p-1.5" />}
        <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">{org.name}</h1>
      </div>
      {org.about && <p className="m-0 text-xl text-slate max-w-[60ch]">{org.about}</p>}
      {org.website && <a href={org.website} className="font-bold">{org.website.replace(/^https?:\/\//, "")}</a>}
      <h2 className="m-0 text-2xl font-bold">Open roles</h2>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))]">
        {((opps ?? []) as Listing[]).map((o) => <RoleCard key={o.id} o={o} />)}
      </div>
      {!(opps ?? []).length && <p className="m-0 text-slate">No open roles right now.</p>}
    </div>
  );
}
