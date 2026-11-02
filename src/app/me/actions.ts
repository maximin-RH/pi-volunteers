"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { phoneOk } from "@/lib/format";
import { SMS_ENABLED } from "@/lib/features";

export type PrefsState = { ok?: boolean; error?: string };

export async function saveReminderPrefs(_: PrefsState, form: FormData): Promise<PrefsState> {
  const email = form.get("reminderEmail") === "on";
  const sms = SMS_ENABLED && form.get("reminderSms") === "on";
  const phone = String(form.get("reminderPhone") ?? "").trim();
  if (sms && !phone) return { error: "Add a mobile number for text reminders." };
  if (phone && !phoneOk(phone)) return { error: "Check the mobile number." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };
  const { error } = await supabase
    .from("profiles")
    .update({ reminder_email: email, reminder_sms: sms, reminder_phone: phone || null })
    .eq("id", user.id);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/me");
  return { ok: true };
}

/** New private calendar link; the old one stops working. orgId for an organisation's link. */
export async function resetCalendarLink(orgId: string | null) {
  const supabase = await createClient();
  await supabase.rpc("reset_my_calendar_token", { p_org: orgId });
  revalidatePath(orgId ? "/org/dashboard" : "/me");
}

export type DeleteState = { error?: string };

export async function deleteAccount(_: DeleteState, form: FormData): Promise<DeleteState> {
  if (String(form.get("confirm") ?? "").trim().toLowerCase() !== "delete") return { error: "Type delete to confirm." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { error: error.message.startsWith("You look after") ? error.message : "That didn't work. Try again, or contact us." };
  await supabase.auth.signOut().catch(() => {});
  redirect("/sign-in?account=deleted");
}
