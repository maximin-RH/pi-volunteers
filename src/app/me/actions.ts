"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { phoneOk } from "@/lib/format";

export type PrefsState = { ok?: boolean; error?: string };

export async function saveReminderPrefs(_: PrefsState, form: FormData): Promise<PrefsState> {
  const email = form.get("reminderEmail") === "on";
  const sms = form.get("reminderSms") === "on";
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
