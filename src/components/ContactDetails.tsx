export type Contacts = {
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  onsite_same: boolean;
  onsite_name: string | null;
  onsite_phone: string | null;
};

const tel = (p: string) => "tel:" + p.replace(/[^\d+]/g, "");

/** Who to ask before the day and who to meet on it. RLS only returns these to registered volunteers. */
export function ContactDetails({ c, compact }: { c: Contacts; compact?: boolean }) {
  const onsiteName = c.onsite_same ? c.contact_name : c.onsite_name;
  const onsitePhone = c.onsite_same ? c.contact_phone : c.onsite_phone;
  const item = compact ? "flex flex-wrap gap-x-2 text-[15px]" : "flex flex-col gap-0.5";
  return (
    <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-3 rounded-card bg-cream p-5"}>
      {c.contact_name && (
        <div className={item}>
          <span className={compact ? "font-bold" : "text-sm font-bold text-slate"}>Questions{compact ? ":" : ""}</span>
          <span className={compact ? "" : "font-bold"}>{c.contact_name}</span>
          {c.contact_phone && <a href={tel(c.contact_phone)} className="font-bold">{c.contact_phone}</a>}
          {c.contact_email && <a href={"mailto:" + c.contact_email} className="font-bold break-all">{c.contact_email}</a>}
        </div>
      )}
      {onsiteName && (
        <div className={item}>
          <span className={compact ? "font-bold" : "text-sm font-bold text-slate"}>On the day, ask for{compact ? ":" : ""}</span>
          <span className={compact ? "" : "font-bold"}>{onsiteName}</span>
          {onsitePhone && <a href={tel(onsitePhone)} className="font-bold">{onsitePhone}</a>}
        </div>
      )}
    </div>
  );
}
