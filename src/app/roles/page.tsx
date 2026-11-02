import { listOpportunities, listCategories, listSuburbs } from "@/lib/queries";
import { RoleCard } from "@/components/RoleCard";

export const metadata = { title: "Find a role" };

export default async function Roles({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [opps, cats, suburbs] = await Promise.all([
    listOpportunities({ category: sp.category || undefined, suburb: sp.suburb || undefined, days: sp.days ? Number(sp.days) : undefined }),
    listCategories(),
    listSuburbs(),
  ]);

  return (
    <div className="mx-auto max-w-[1240px] px-6 pt-10 pb-16 flex flex-col gap-6">
      <h1 className="m-0 text-[clamp(36px,4.5vw,56px)] leading-none font-bold tracking-tight">Find a role</h1>
      <form className="flex flex-wrap gap-3 items-end">
        <Select name="category" label="Category" value={sp.category} options={[["", "All categories"], ...cats.map((c) => [c.slug, c.label] as [string, string])]} />
        <Select name="suburb" label="Suburb" value={sp.suburb} options={[["", "Anywhere on the Island"], ...suburbs.map((s) => [s, s] as [string, string])]} />
        <Select name="days" label="When" value={sp.days} options={[["7", "This week"], ["14", "Next 2 weeks"], ["", "Any time"]]} />
        <button className="h-12 px-6 rounded-full bg-navy hover:bg-navy-deep text-white font-bold">Apply</button>
      </form>
      <p className="m-0 text-slate">{opps.length} {opps.length === 1 ? "role" : "roles"}</p>
      <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))]">
        {opps.map((o) => <RoleCard key={o.id} o={o} />)}
      </div>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1.5 font-bold min-w-[200px]">
      {label}
      <select name={name} defaultValue={value ?? ""} className="h-12 rounded-xl border-[1.5px] border-sand-line bg-white px-3.5 text-[17px] font-normal">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
