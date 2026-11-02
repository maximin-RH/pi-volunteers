"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { melbourneToIso, slugify } from "@/lib/format";

export type RegState = { ok?: boolean; error?: string };

const OrgSchema = z.object({
  name: z.string().trim().min(2, "Add your organisation name."),
  type: z.enum(["incorporated_association", "registered_charity", "club", "school_or_council", "informal_group"]),
  abn: z.string().trim().optional(),
  contactName: z.string().trim().min(1, "Add a contact name."),
  contactEmail: z.string().trim().email("Check the contact email."),
  about: z.string().trim().max(160).optional(),
});

export async function registerOrg(_: RegState, form: FormData): Promise<RegState> {
  const p = OrgSchema.safeParse(Object.fromEntries([...form].filter(([k]) => k !== "childSafe")));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  if (v.type !== "informal_group" && !v.abn) return { error: "Add your ABN or incorporation number." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  let childSafePath: string | null = null;
  const file = form.get("childSafe");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "application/pdf") return { error: "The Child Safe document must be a PDF." };
    childSafePath = user.id + "/" + Date.now() + ".pdf";
    const { error } = await supabase.storage.from("child-safe").upload(childSafePath, file);
    if (error) return { error: "The document didn't upload. Try again." };
  }

  const { error } = await supabase.from("organisations").insert({
    slug: slugify(v.name) + "-" + Math.random().toString(36).slice(2, 6),
    name: v.name,
    type: v.type,
    abn: v.abn || null,
    contact_name: v.contactName,
    contact_email: v.contactEmail,
    about: v.about || null,
    child_safe_doc_path: childSafePath,
    created_by: user.id,
  });
  if (error) return { error: "That didn't save. Try again." };

  // TODO(phase 1): notify admins by email.
  revalidatePath("/org/dashboard");
  return { ok: true };
}

const PostSchema = z.object({
  orgId: z.string().uuid(),
  id: z.string().uuid().optional().or(z.literal("")),
  clonedFrom: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(3, "Add a role title."),
  category: z.string().min(1),
  kind: z.enum(["slot", "ongoing"]),
  date: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  peopleNeeded: z.coerce.number().int().min(1),
  venue: z.string().trim().optional(),
  suburb: z.string().optional(),
  description: z.string().trim().optional(),
  provides: z.string().trim().optional(),
  intent: z.enum(["draft", "live"]),
});

export async function savePost(_: RegState, form: FormData): Promise<RegState> {
  const p = PostSchema.safeParse(Object.fromEntries([...form].filter(([k]) => k !== "requirements")));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;

  let starts_at: string | null = null;
  let ends_at: string | null = null;
  if (v.kind === "slot") {
    if (!v.date || !v.start || !v.end) return { error: "Add a date, start and finish time." };
    starts_at = melbourneToIso(v.date, v.start);
    ends_at = melbourneToIso(v.date, v.end);
    if (ends_at <= starts_at) return { error: "Finish time must be after the start time." };
  }

  const row = {
    org_id: v.orgId,
    title: v.title,
    category: v.category,
    kind: v.kind,
    starts_at,
    ends_at,
    people_needed: v.peopleNeeded,
    venue: v.venue || null,
    suburb: v.suburb || null,
    description: v.description || null,
    provides: v.provides || null,
    requirements: form.getAll("requirements").map(String),
    status: v.intent,
    cloned_from: v.clonedFrom || null,
  };

  const supabase = await createClient();
  const q = v.id
    ? supabase.from("opportunities").update(row).eq("id", v.id).select("id").single()
    : supabase.from("opportunities").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) {
    return { error: v.intent === "live" ? "Couldn't publish. Your group may still be waiting for approval, so save it as a draft for now." : "That didn't save. Try again." };
  }

  revalidatePath("/org/dashboard");
  revalidatePath("/");
  redirect("/org/dashboard?" + (v.intent === "live" ? "share=" + data.id : "saved=1"));
}

export async function setInterestStatus(interestId: string, status: "confirmed" | "declined") {
  const supabase = await createClient();
  await supabase.from("interests").update({ status }).eq("id", interestId);
  // TODO(phase 1): email the volunteer (confirmed → details + .ics invite).
  revalidatePath("/org/dashboard");
}
