import { getOpportunity } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { roleUrl, toIcs } from "@/lib/calendar";
import { slugify } from "@/lib/format";

// One volunteer slot as a calendar file, with reminders. Opens in Apple Calendar, Outlook and most others.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const id = (await params).file.replace(/\.ics$/, "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const o = await getOpportunity(id);
  if (!o?.starts_at || !o.ends_at) return new Response("Not found", { status: 404 });

  // RLS only returns contacts to volunteers registered for this role (and the organisation).
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("opportunity_contacts")
    .select("contact_name,contact_phone,onsite_same,onsite_name,onsite_phone")
    .eq("opportunity_id", id)
    .maybeSingle();
  const onsite = c && (c.onsite_same ? [c.contact_name, c.contact_phone] : [c.onsite_name, c.onsite_phone]).filter(Boolean).join(", ");

  const ics = toIcs(
    [{
      id: o.id,
      title: o.title + " · " + o.org_name,
      start: o.starts_at,
      end: o.ends_at,
      location: [o.venue, o.suburb, "Phillip Island VIC"].filter(Boolean).join(", "),
      description: [o.description, o.provides && "Provided: " + o.provides, onsite && "On the day, ask for: " + onsite].filter(Boolean).join("\n\n"),
      url: roleUrl(o.id),
    }],
    { name: o.title },
  );
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(o.title) || "volunteer-slot"}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
