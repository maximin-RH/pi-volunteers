import { createClient } from "@/lib/supabase/server";

/** The signed-in user's first organisation (multi-org switching is a later task). */
export async function currentOrg() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, org: null };
  const { data } = await supabase
    .from("org_members")
    .select("role, org:organisations(id,name,slug,status,child_safe_doc_path,approved_at)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  type Org = { id: string; name: string; slug: string; status: string; child_safe_doc_path: string | null; approved_at: string | null };
  return { user, org: (data?.org ?? null) as unknown as Org | null };
}
