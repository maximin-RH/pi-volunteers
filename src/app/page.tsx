import Link from "next/link";
import { listOpportunities, listCategories } from "@/lib/queries";
import { RoleCard } from "@/components/RoleCard";

export const revalidate = 60;

export default async function Home() {
  const [opps, cats] = await Promise.all([listOpportunities({ days: 14 }), listCategories()]);
  const next = opps.find((o) => o.starts_at);

  return (
    <>
      {/* Hero: full-bleed sunrise photo under the floating header */}
      <section className="relative -mt-[76px] min-h-[clamp(680px,92vh,900px)] flex overflow-hidden bg-navy">
        <img src="/images/sunrise-sky.jpg" alt="Blue sky fading to orange over Western Port, with surfers waiting on the waves" className="absolute inset-0 w-full h-full object-cover object-[50%_72%]" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(12,28,54,.78)_0%,rgba(12,28,54,.5)_40%,rgba(12,28,54,0)_72%)]" />
        <div className="relative mx-auto w-full max-w-[1240px] px-6 pt-[clamp(128px,16vh,170px)] pb-10 flex flex-col justify-between gap-12">
          <div className="flex flex-col gap-6 max-w-[760px]">
            <div className="self-start flex items-center gap-2.5 rounded-full bg-paper/90 py-2 pl-2.5 pr-3.5 text-[15px]">
              <span className="w-2.5 h-2.5 rounded-full bg-orange shadow-[0_0_0_5px_rgba(210,96,26,.2)]" />
              <span><strong>{opps.length} open</strong> in the next 2 weeks</span>
            </div>
            <h1 className="m-0 text-white font-bold text-[clamp(52px,7vw,104px)] leading-[.95] tracking-[-0.045em] text-balance">
              Lend a hand on the Island <span className="text-amber">this week.</span>
            </h1>
            <p className="m-0 text-sand text-[21px] leading-normal max-w-[44ch] text-pretty">
              Local groups post what they need. You pick what suits your week. Free, Phillip Island only, and nothing about you is shared until you say so.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <form action="/roles" className="flex-[1_1_420px] max-w-[620px] flex flex-wrap items-center gap-1.5 p-1.5 rounded-full bg-white shadow-[0_20px_50px_-20px_rgba(12,28,54,.6)]">
              <label className="flex-[1_1_200px] flex flex-col px-4.5 py-1.5 min-w-0">
                <span className="text-[13px] font-bold text-slate">What interests you</span>
                <select name="category" className="bg-transparent text-[17px] font-bold outline-none">
                  <option value="">Anything</option>
                  {cats.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </label>
              <label className="flex-[1_1_140px] flex flex-col px-4.5 py-1.5">
                <span className="text-[13px] font-bold text-slate">When</span>
                <select name="days" className="bg-transparent text-[17px] font-bold outline-none" defaultValue="7">
                  <option value="7">This week</option>
                  <option value="14">Next 2 weeks</option>
                  <option value="">Any time</option>
                </select>
              </label>
              <button className="shrink-0 h-14 px-7 rounded-full bg-orange hover:bg-orange-deep text-white text-lg font-bold">Find a role</button>
            </form>
            {next && (
              <Link href={"/roles/" + next.id} className="flex-[0_1_340px] bg-white rounded-3xl p-4.5 no-underline shadow-[0_24px_60px_-20px_rgba(12,28,54,.6)]">
                <span className="text-[13px] font-bold text-orange">Next up</span>
                <span className="block text-[17px] font-bold leading-tight">{next.title}</span>
                <span className="block text-sm text-slate">{next.org_name}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-14 flex flex-col gap-5">
        <div className="flex justify-between items-end gap-4 flex-wrap">
          <h2 className="m-0 text-4xl font-bold tracking-tight">Coming up</h2>
          <Link href="/roles" className="font-bold">See all roles →</Link>
        </div>
        {opps.length ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))]">
            {opps.slice(0, 6).map((o) => <RoleCard key={o.id} o={o} />)}
          </div>
        ) : (
          <p className="rounded-card bg-cream p-6 text-lg text-slate">No roles posted yet. Island groups can <Link href="/org/register">register here</Link>.</p>
        )}
      </section>

      <section className="mx-4 rounded-hero relative overflow-hidden bg-navy text-white">
        <img src="/images/sunset-pano.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-[50%_60%]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,28,54,.92)_0%,rgba(12,28,54,.7)_60%,rgba(12,28,54,.45)_100%)]" />
        <div className="relative mx-auto max-w-[1240px] px-6 py-16 flex flex-col gap-4 max-w-[640px]">
          <span className="font-bold text-amber">For Island groups</span>
          <h2 className="m-0 text-[clamp(32px,4vw,48px)] leading-none font-bold tracking-tight">Post a need in 3 minutes. Share it wherever your community looks.</h2>
          <p className="m-0 text-lg text-sand max-w-[52ch]">Every post comes with a link and a preview ready for Facebook, WhatsApp, email and text, wording for your newsletter, and a link for your own website.</p>
          <Link href="/org/register" className="self-start h-14 px-7 flex items-center rounded-full bg-orange hover:bg-orange-deep text-white hover:text-white text-lg font-bold no-underline">Register your group</Link>
        </div>
      </section>
    </>
  );
}
