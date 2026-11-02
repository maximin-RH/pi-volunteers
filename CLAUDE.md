# Pi-Volunteers: notes for Claude Code

## Product
Volunteer noticeboard for Phillip Island (Victoria, Australia). Two account types: volunteers and organisation members. Plus admins.
Launch scope: website with accounts. **Volunteers must be 18+**. Under-18 and guardian consent is phase 2.
Launch organisations: Island Voice, Carols by the Bay. Their details in `supabase/seed.sql` are TODO placeholders. Never invent ABNs, addresses or contacts.

## Design source of truth
`docs/design/Pi-Volunteers Website v3.dc.html` (open in a browser). Match its layout, copy and colours when building or porting a screen.
Tokens live in `src/app/globals.css` (`@theme`). Use those Tailwind names (`bg-navy`, `text-orange`, `rounded-card`), never raw hex in components.
- Font: Atkinson Hyperlegible, 400 and 700 only.
- Shapes: pill buttons (`rounded-full`), cards `rounded-card` (22px), panels `rounded-panel` (28px), hero blocks `rounded-hero` (32px).
- Hit targets at least 44px (`min-h-11`).
- Orange `#D2601A` for the primary action; navy `#13294B` for text, dark panels and secondary buttons.

## Copy rules
Australian English (organisation, programme). Sentence case. Numerals for quantities. En dash for ranges (9am–12pm). No exclamation marks, no emoji. Say "volunteer slot" in the UI, never "shift". In code the enum is `slot`.

## Code rules
- Next.js 15 App Router. Server Components by default; `"use client"` only for forms with local state.
- Mutations are Server Actions in `actions.ts` files, validated with zod.
- All data access goes through Supabase with RLS. **Never use the service-role key in app code.** If a feature seems to need it, write a `security definer` SQL function instead.
- Schema changes: add a new file in `supabase/migrations/`, never edit `0001_init.sql` after it's been pushed.
- Server jobs without a user session (reminders) follow the same rule: `security definer` functions guarded by a secret in `app_secrets`, called with the anon key. See `claim_due_reminders`.
- Calendar feeds are read by token through `calendar_feed_events`; org feeds carry counts only, never volunteer names.
- Times are stored as UTC `timestamptz` and shown in `Australia/Melbourne` (see `src/lib/format.ts`).
- Personal data: organisations only see a volunteer's display name plus what the volunteer ticked to share. In the other direction, a role's contacts (`opportunity_contacts`) are only visible to volunteers registered for that role, and only once the org has ticked permission to share. Never add them to `opportunity_listing`.
- Domain: `https://www.pi-volunteers.com`. `pi-volunteer.com` (singular) redirects to it.

## Commands
`npm run dev` · `npx supabase db reset` · `npm run typecheck` · `npm run db:types`

## Next tasks
See `docs/ROADMAP.md`. Work top to bottom.
