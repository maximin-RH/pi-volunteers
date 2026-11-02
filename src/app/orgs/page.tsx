import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Organisations" };
export const revalidate = 300;

export default async function Orgs() {
  const supabase = await createClient();
  const { data: orgs } = await supabase.from("organisations").select("slug,name,about,child_safe_doc_path").eq("status", "approved").order("name");

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-10 pb-16 flex flex-col gap-6">
      <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">Organisations</h1>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))]">
        {(orgs ?? []).map((o) => (
          <Link key={o.slug} href={"/orgs/" + o.slug} className="rounded-card bg-white border border-sand-line p-5 flex flex-col gap-2 no-underline hover:border-navy">
            <span className="text-xl font-bold">{o.name}</span>
            {o.about && <span className="text-slate">{o.about}</span>}
            <span className="flex gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-sky-tint">Approved</span>
              {o.child_safe_doc_path && <span className="px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-peach text-rust">Child Safe evidence</span>}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
