# Roadmap

## Phase 1: before launch
1. **Emails (Resend).** Org gets an email when someone is interested. Volunteer gets one when confirmed, with an `.ics` calendar invite and the role's contacts (`opportunity_contacts`). Admins get one when a new org registers.
2. **Admin screen** at `/admin`: approve or reject organisations, view Child Safe PDFs (signed URLs) and logos, suspend posts.
3. ~~Role images~~ Done: optional event photo in the post editor, falling back to the org logo (required at registration). Still to do: let orgs change their logo after registering.
4. **About page.** Port from the design file.
5. **Calendar view** (month / week / list) from the design file.
6. **Privacy policy and volunteer terms.** Needs real wording. Not legal advice in this repo. Must cover: role contacts shared with registered volunteers, and organisations recording attendance (`interests.attended`).
7. **Generate types** (`npm run db:types`) and replace the `as unknown as` casts.
8. **Accessibility pass.** Keyboard, focus order, screen reader labels, contrast.
9. **Real data.** Confirm Island Voice and Carols by the Bay details; load their first roles.

## Phase 2
- Under-18 volunteers (15–17) with guardian approval, as prototyped in `Pi-Volunteers.dc.html`. Needs a `guardian_consents` table, an email/SMS approval link, and the min-age rule in the interest policy.
- Noticeboard PDF with QR code.
- Multiple members per organisation, invites.
- Reminder SMS the day before a confirmed slot.
- Mobile app (or install as a web app first).

## Later: volunteer recognition (decided 2026-11-02, not yet built)
Groundwork in place: organisations can optionally tick who attended a past volunteer slot (`interests.attended`). Nothing uses it yet.
- **Accolades.** Acknowledgements rather than scores, e.g. "10 events volunteered", "Shout-out from Island Voice". Shown to the volunteer on My volunteering.
- **Community perks.** Accolades could build to loyalty-style perks offered around the Island, e.g. a free visit to a nature park venue. Needs partner venues.
- **Reliability when choosing.** When a role is oversubscribed, show the organisation a volunteer's record (slots attended, notice given when withdrawing). Never public.
- **Privacy stays as is.** No public volunteer profiles. An organisation sees a volunteer only after they apply to that organisation's role.
