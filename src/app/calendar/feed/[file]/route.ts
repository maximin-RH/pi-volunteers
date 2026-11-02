import { createClient } from "@/lib/supabase/server";
import { roleUrl, toIcs } from "@/lib/calendar";

type FeedRow = {
  id: string; title: string; org_name: string; starts_at: string; ends_at: string; venue: string | null; suburb: string | null;
  description: string | null; tentative: boolean; people_needed: number; confirmed_count: number;
  onsite_name: string | null; onsite_phone: string | null; feed_kind: "volunteer" | "org";
};

// Calendar subscription feed. Calendar apps fetch it without signing in; the private token is the key.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const token = (await params).file.replace(/\.ics$/, "");
  if (!/^[0-9a-f]{36}$/.test(token)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("calendar_feed_events", { p_token: token });
  if (error) return new Response("Calendar unavailable", { status: 500 });
  const rows = (data ?? []) as FeedRow[];
  const isOrg = rows[0]?.feed_kind === "org";

  const ics = toIcs(
    rows.map((r) => {
      const onsite = [r.onsite_name, r.onsite_phone].filter(Boolean).join(", ");
      return {
        id: r.id,
        title: isOrg
          ? `${r.title}: ${r.confirmed_count} of ${r.people_needed} confirmed`
          : r.title + " · " + r.org_name + (r.tentative ? " (waiting for the group)" : ""),
        start: r.starts_at,
        end: r.ends_at,
        location: [r.venue, r.suburb, "Phillip Island VIC"].filter(Boolean).join(", "),
        description: [r.description, onsite && "On the day, ask for: " + onsite].filter(Boolean).join("\n\n"),
        url: roleUrl(r.id),
        tentative: r.tentative,
      };
    }),
    { name: !rows.length ? "Pi-Volunteers" : isOrg ? "Pi-Volunteers: " + rows[0].org_name : "Pi-Volunteers: my volunteering", refreshHours: 3 },
  );
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
