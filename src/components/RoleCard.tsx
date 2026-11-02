import Link from "next/link";
import type { Listing } from "@/lib/queries";
import { dateParts, timeRange } from "@/lib/format";

export function RoleCard({ o }: { o: Listing }) {
  const d = dateParts(o.starts_at);
  const left = Math.max(0, o.people_needed - o.confirmed_count);
  return (
    <Link
      href={"/roles/" + o.id}
      className="group flex gap-4 items-center rounded-card bg-white border border-sand-line p-4 no-underline hover:border-navy transition-colors"
    >
      <span className="shrink-0 w-16 h-[68px] rounded-[20px] bg-peach text-rust flex flex-col items-center justify-center">
        {d ? (
          <>
            <span className="text-xs font-bold">{d.dow}</span>
            <span className="text-2xl font-bold leading-none">{d.day}</span>
            <span className="text-xs font-bold">{d.mon}</span>
          </>
        ) : (
          <span className="text-xs font-bold text-center px-1">Ongoing</span>
        )}
      </span>
      <span className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-bold text-orange">{o.org_name}</span>
        <span className="text-lg font-bold leading-tight">{o.title}</span>
        <span className="text-[15px] text-slate">
          {[timeRange(o.starts_at, o.ends_at), o.suburb, left ? left + " spots left" : "Full"].filter(Boolean).join(" · ")}
        </span>
      </span>
    </Link>
  );
}
