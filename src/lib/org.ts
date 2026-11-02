import { createClient } from "@/lib/supabase/server";

/** The signed-in user's first organisation (multi-org switching is a later task). */
export async function currentOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, org: null };
  const { data } = await supabase
    .from("org_members")
    .select("role, org:organisations(id,name,slug,status,has_child_safe,approved_at,logo_path,contact:organisation_contacts(contact_name,contact_email))")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  type Org = {
    id: string; name: string; slug: string; status: string; has_child_safe: boolean; approved_at: string | null;
    logo_path: string | null; contact: { contact_name: string; contact_email: string } | null;
  };
  return { user, org: (data?.org ?? null) as unknown as Org | null };
}
