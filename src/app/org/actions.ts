"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { melbourneToIso, slugify } from "@/lib/format";
import { IMAGE_TYPES, imageProblem } from "@/lib/images";

export type RegState = { ok?: boolean; error?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Uploads an image to `bucket/folder/` and returns its path. */
async function uploadImage(supabase: Supabase, bucket: "role-images" | "org-logos", folder: string, file: File) {
  const path = folder + "/" + Date.now() + "." + IMAGE_TYPES[file.type];
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  return error ? null : path;
}

const fileOf = (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? v : null);

const OrgSchema = z.object({
  name: z.string().trim().min(2, "Add your organisation name."),
  type: z.enum(["incorporated_association", "registered_charity", "club", "school_or_council", "informal_group"]),
  abn: z.string().trim().optional(),
  contactName: z.string().trim().min(1, "Add a contact name."),
  contactEmail: z.string().trim().email("Check the contact email."),
  about: z.string().trim().max(160).optional(),
});

export async function registerOrg(_: RegState, form: FormData): Promise<RegState> {
  const p = OrgSchema.safeParse(Object.fromEntries([...form].filter(([k]) => k !== "childSafe" && k !== "logo")));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  if (v.type !== "informal_group" && !v.abn) return { error: "Add your ABN or incorporation number." };

  const logo = fileOf(form.get("logo"));
  if (!logo) return { error: "Add your group's logo." };
  const logoProblem = imageProblem(logo);
  if (logoProblem) return { error: "Logo: " + logoProblem };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in first." };

  const logoPath = await uploadImage(supabase, "org-logos", user.id, logo);
  if (!logoPath) return { error: "The logo didn't upload. Try again." };

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
    logo_path: logoPath,
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
  imagePath: z.string().optional(),
  contactName: z.string().trim().max(80).optional(),
  contactEmail: z.string().trim().email("Check the point person's email.").optional().or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  onsiteSame: z.literal("on").optional(),
  onsiteName: z.string().trim().max(80).optional(),
  onsitePhone: z.string().trim().optional(),
  shareConsent: z.literal("on").optional(),
  intent: z.enum(["draft", "live"]),
});

/** Australian landline or mobile, with or without +61, spaces, brackets or dashes. */
const phoneOk = (s: string) => /^\+?\d{8,12}$/.test(s.replace(/[\s()-]/g, ""));

/** Contact checks. Drafts only need valid formats; publishing needs the full set and permission. */
function contactProblem(v: z.infer<typeof PostSchema>): string | null {
  if (v.contactPhone && !phoneOk(v.contactPhone)) return "Check the point person's phone number.";
  if (!v.onsiteSame && v.onsitePhone && !phoneOk(v.onsitePhone)) return "Check the on-the-day contact's phone number.";
  if (v.intent === "draft") return null;
  if (!v.contactName) return "Add a point person for volunteers' questions.";
  if (!v.contactEmail && !v.contactPhone) return "Add an email or phone number for the point person.";
  if (!v.onsiteSame && !v.onsiteName) return "Add who volunteers should meet on the day.";
  if (!v.shareConsent) return "Confirm you have permission to share these contact details with registered volunteers.";
  return null;
}

export async function savePost(_: RegState, form: FormData): Promise<RegState> {
  const p = PostSchema.safeParse(Object.fromEntries([...form].filter(([k]) => k !== "requirements" && k !== "image")));
  if (!p.success) return { error: p.error.issues[0].message };
  const v = p.data;
  const contactError = contactProblem(v);
  if (contactError) return { error: contactError };

  const image = fileOf(form.get("image"));
  if (image) {
    const problem = imageProblem(image);
    if (problem) return { error: "Event photo: " + problem };
  }

  let starts_at: string | null = null;
  let ends_at: string | null = null;
  if (v.kind === "slot") {
    if (!v.date || !v.start || !v.end) return { error: "Add a date, start and finish time." };
    starts_at = melbourneToIso(v.date, v.start);
    ends_at = melbourneToIso(v.date, v.end);
    if (ends_at <= starts_at) return { error: "Finish time must be after the start time." };
  }

  const supabase = await createClient();
  // Keep an existing or cloned photo unless a new one was chosen. Only paths in this org's folder.
  let image_path = v.imagePath?.startsWith(v.orgId + "/") ? v.imagePath : null;
  if (image) {
    image_path = await uploadImage(supabase, "role-images", v.orgId, image);
    if (!image_path) return { error: "The event photo didn't upload. Try again." };
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
    image_path,
  };

  const q = v.id
    ? supabase.from("opportunities").update(row).eq("id", v.id).select("id").single()
    : supabase.from("opportunities").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) {
    return { error: v.intent === "live" ? "Couldn't publish. Your group may still be waiting for approval, so save it as a draft for now." : "That didn't save. Try again." };
  }

  const onsiteSame = !!v.onsiteSame;
  const { error: contactSaveError } = await supabase.from("opportunity_contacts").upsert(
    {
      opportunity_id: data.id,
      contact_name: v.contactName || null,
      contact_email: v.contactEmail || null,
      contact_phone: v.contactPhone || null,
      onsite_same: onsiteSame,
      onsite_name: onsiteSame ? null : v.onsiteName || null,
      onsite_phone: onsiteSame ? null : v.onsitePhone || null,
      share_consent: !!v.shareConsent,
    },
    { onConflict: "opportunity_id" }
  );
  if (contactSaveError) return { error: "The role saved but the contact details didn't. Open it again and re-save." };

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
