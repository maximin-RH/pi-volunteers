import { createClient } from "@/lib/supabase/server";

export type Listing = {
  id: string;
  org_id: string;
  org_name: string;
  org_slug: string;
  org_child_safe: boolean;
  title: string;
  category: string;
  kind: "slot" | "ongoing";
  starts_at: string | null;
  ends_at: string | null;
  people_needed: number;
  confirmed_count: number;
  venue: string | null;
  suburb: string | null;
  description: string | null;
  provides: string | null;
  requirements: string[];
  image_path: string | null;
  org_logo: string | null;
};

export async function listOpportunities(opts: { category?: string; suburb?: string; days?: number } = {}) {
  const supabase = await createClient();
  let q = supabase.from("opportunity_listing").select("*").order("starts_at", { ascending: true, nullsFirst: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.suburb) q = q.eq("suburb", opts.suburb);
  if (opts.days) {
    const until = new Date(Date.now() + opts.days * 864e5).toISOString();
    q = q.or("kind.eq.ongoing,and(starts_at.gte." + new Date().toISOString() + ",starts_at.lte." + until + ")");
  } else {
    q = q.or("kind.eq.ongoing,starts_at.gte." + new Date().toISOString());
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export async function getOpportunity(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("opportunity_listing").select("*").eq("id", id).maybeSingle();
  return data as Listing | null;
}

export async function listCategories() {
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("slug,label").order("sort");
  return data ?? [];
}

export async function listSuburbs() {
  const supabase = await createClient();
  const { data } = await supabase.from("suburbs").select("name").order("name");
  return (data ?? []).map((s) => s.name as string);
}

export const REQ_LABELS: Record<string, string> = {
  WWCC: "Working with Children Check",
  RSA: "RSA (serving alcohol)",
  "First Aid": "First Aid certificate",
  Licence: "Driver licence",
  "Police check": "Police check",
};
