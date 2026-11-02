"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  opportunityId: z.string().uuid(),
  displayName: z.string().trim().min(1, "Add the name the group will see.").max(60),
  adult: z.literal("on", { errorMap: () => ({ message: "You need to be 18 or over to volunteer through Pi-Volunteers for now." }) }),
  shareEmail: z.string().optional(),
  sharePhone: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type InterestState = { ok?: boolean; error?: string };

export async function registerInterest(_: InterestState, form: FormData): Promise<InterestState> {
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  await supabase.from("profiles").update({ display_name: v.displayName, adult_confirmed: true }).eq("id", user.id);

  const { error } = await supabase.from("interests").upsert(
    {
      opportunity_id: v.opportunityId,
      volunteer_id: user.id,
      status: "interested",
      display_name: v.displayName,
      shared_email: v.shareEmail ? user.email ?? null : null,
      shared_phone: v.sharePhone ? user.phone ?? null : null,
      note: v.note || null,
    },
    { onConflict: "opportunity_id,volunteer_id" }
  );
  if (error) return { error: "That didn't save. Try again, or contact the group directly." };

  // TODO(phase 1): email the org contact via Resend. See docs/ROADMAP.md.
  revalidatePath("/roles/" + v.opportunityId);
  revalidatePath("/me");
  return { ok: true };
}

export async function withdrawInterest(opportunityId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("interests").update({ status: "withdrawn" }).eq("opportunity_id", opportunityId).eq("volunteer_id", user.id);
  revalidatePath("/me");
  revalidatePath("/roles/" + opportunityId);
}
