# Roadmap

## Phase 1: before launch
1. **Emails (Resend).** Org gets an email when someone is interested. Volunteer gets one when confirmed, with an `.ics` calendar invite. Admins get one when a new org registers.
2. **Admin screen** at `/admin`: approve or reject organisations, view Child Safe PDFs (signed URLs), suspend posts.
3. **Role images.** Upload in the post editor to the `role-images` bucket; fall back to a category photo.
4. **About page.** Port from the design file.
5. **Calendar view** (month / week / list) from the design file.
6. **Privacy policy and volunteer terms.** Needs real wording. Not legal advice in this repo.
7. **Generate types** (`npm run db:types`) and replace the `as unknown as` casts.
8. **Accessibility pass.** Keyboard, focus order, screen reader labels, contrast.
9. **Real data.** Confirm Island Voice and Carols by the Bay details; load their first roles.

## Phase 2
- Under-18 volunteers (15–17) with guardian approval, as prototyped in `Pi-Volunteers.dc.html`. Needs a `guardian_consents` table, an email/SMS approval link, and the min-age rule in the interest policy.
- Noticeboard PDF with QR code.
- Multiple members per organisation, invites.
- Reminder SMS the day before a confirmed slot.
- Mobile app (or install as a web app first).
