import { createClient } from "@supabase/supabase-js";
import { fullDate, timeRange } from "@/lib/format";
import { roleUrl } from "@/lib/calendar";
import { sendEmail, sendSms, type SendResult } from "@/lib/notify";

// Called every 15 minutes by the database scheduler (pg_cron, see README), or by hand when testing.
// Sends reminders that are due. The database decides what's due and records each send, so running
// this twice never sends twice. No service-role key: the shared secret unlocks two SQL functions.

type Due = {
  log_id: number; channel: "email" | "sms"; hours_before: number; email: string | null; phone: string | null;
  display_name: string; opportunity_id: string; title: string; org_name: string; starts_at: string; ends_at: string;
  venue: string | null; suburb: string | null; onsite_name: string | null; onsite_phone: string | null;
};

const TZ = "Australia/Melbourne";
const day = (d: Date | string) => Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d)));

/** "today", "tomorrow" or "on Sat, 7 Nov", from the actual start (a reminder can run a little late). */
function when(startsAt: string) {
  const days = Math.round((day(startsAt) - day(new Date())) / 864e5);
  return days === 0 ? "today" : days === 1 ? "tomorrow" : "on " + fullDate(startsAt);
}
const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== "Bearer " + secret) {
    return Response.json({ error: "Not allowed" }, { status: 401 });
  }

  // No user session here, so a plain client with the public anon key.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("claim_due_reminders", { p_secret: secret });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results: { id: number; channel: string; status: string; detail?: string }[] = [];
  for (const r of (data ?? []) as Due[]) {
    const res = await send(r);
    await supabase.rpc("finish_reminder", { p_secret: secret, p_id: r.log_id, p_status: res.status, p_detail: res.detail ?? null });
    results.push({ id: r.log_id, channel: r.channel, ...res });
  }
  return Response.json({ processed: results.length, results });
}

function send(r: Due): Promise<SendResult> {
  const whenText = when(r.starts_at);
  const date = fullDate(r.starts_at) + ", " + timeRange(r.starts_at, r.ends_at);
  const place = [r.venue, r.suburb].filter(Boolean).join(", ");
  const onsite = [r.onsite_name, r.onsite_phone].filter(Boolean).join(" on ");
  const link = roleUrl(r.opportunity_id);

  if (r.channel === "sms") {
    const body = [
      `Good Local Life: ${r.title} with ${r.org_name} is ` + (whenText.startsWith("on ") ? "on " + date : whenText + ", " + date),
      place && "at " + place,
    ].filter(Boolean).join(" ") + "." + (onsite ? ` Ask for ${onsite}.` : "") + ` Can't make it? ${SITE()}/me`;
    return sendSms(r.phone!, body);
  }

  const subject = `Reminder: ${r.title}, ${fullDate(r.starts_at)}`;
  const lines = [
    `Hi ${r.display_name},`,
    `A reminder that you're volunteering ${whenText} with ${r.org_name}.`,
    `${r.title}\n${date}${place ? "\n" + place : ""}`,
    onsite && `On the day, ask for ${onsite}.`,
    `Details: ${link}`,
    `Can't make it? Let the group know in My volunteering: ${SITE()}/me`,
    "Thanks for helping out on the Island.\nGood Local Life – Phillip Island",
  ].filter(Boolean) as string[];
  const html =
    `<p>Hi ${esc(r.display_name)},</p>` +
    `<p>A reminder that you're volunteering ${esc(whenText)} with ${esc(r.org_name)}.</p>` +
    `<p><strong>${esc(r.title)}</strong><br>${esc(date)}${place ? "<br>" + esc(place) : ""}</p>` +
    (onsite ? `<p>On the day, ask for <strong>${esc(onsite)}</strong>.</p>` : "") +
    `<p><a href="${esc(link)}">See the details</a></p>` +
    `<p>Can't make it? <a href="${esc(SITE())}/me">Let the group know in My volunteering</a>.</p>` +
    `<p>Thanks for helping out on the Island.<br>Good Local Life – Phillip Island</p>`;
  return sendEmail(r.email!, subject, lines.join("\n\n"), html);
}
