# Privacy and security

How Good Local Life handles personal information, which Australian rules apply, what's built in, and what's still to do before launch.

> This is a practical guide written alongside the code, not legal advice. Before launch, have the privacy policy and volunteer terms reviewed. Free starting points for community groups: **Justice Connect Not-for-profit Law** (guides and a free legal help service) and the **OAIC's guides for small business**.

## 1. Which rules apply

| Rule | Does it apply? | What it means for us |
|---|---|---|
| **Privacy Act 1988 (Cth) and the 13 Australian Privacy Principles (APPs)** | Probably not legally at first: entities with annual turnover of A$3 million or less are usually exempt. **Recommended: opt in anyway** (free, through the OAIC's opt-in register). | Groups, councils and funders will expect it, the government has agreed in principle to remove the small business exemption, and the build already follows the APPs. First decide **which legal entity runs Good Local Life** (for example an incorporated association, or EdgeIQ). That entity is the one bound by the Act. |
| **Notifiable Data Breaches scheme** (part of the Privacy Act) | Yes, if we're covered or opt in. | If a breach is likely to cause serious harm: assess within 30 days, then notify the OAIC and the people affected. See the breach plan in section 5. |
| **Statutory tort for serious invasions of privacy** (Privacy and Other Legislation Amendment Act 2024, in force since June 2025) | Yes, for everyone. No small business exemption. | People can sue for serious, intentional or reckless misuse of their information. Strong access controls and not collecting more than we need are the defence. |
| **Health Records Act 2001 (Vic)** | Yes, if we hold any health information, whatever our size. | **Don't collect health information.** The volunteer "note for the group" now asks people not to include medical details. |
| **Spam Act 2003** | Reminders and sign-in emails: no (they're factual messages about something the person asked for). Newsletters, perks programme or promotional emails: yes. | Before any promotional email: get consent, identify the sender, and include a working unsubscribe link. |
| **Australian Consumer Law** | Yes. | No misleading claims (for example "stored in Australia" only if every provider is onshore) and fair volunteer terms. |
| **Children's Online Privacy Code** (OAIC, due by December 2026) | Not while volunteers must be 18+. | Becomes relevant in phase 2 (15–17-year-olds with guardian consent). Revisit then. |
| **Victorian Child Safe Standards; Worker Screening Act 2020 (Vic)** | For the organisations, not us directly. | We collect Child Safe evidence from groups and show "Working with Children Check" requirements. We **don't** collect or store WWCC numbers. |
| **Privacy and Data Protection Act 2014 (Vic)** | Only if a council or Victorian agency contracts with us. | Their privacy obligations would flow to us through the contract. |

## 2. What personal information we hold

Everything is in Supabase (Sydney region), encrypted at rest (AES-256) and in transit (TLS). "Admins" means Good Local Life admins.

| Information | Whose | Stored in | Who can see it | Why | Kept for |
|---|---|---|---|---|---|
| Email address (sign-in) | Volunteers, organisers | Supabase Auth | The person; admins | Sign-in, reminders | Until the account is deleted |
| Display name, 18+ confirmation | Volunteers | `profiles`, `interests` | The person; groups they apply to | Groups know who's coming | Until deleted |
| Email/phone the volunteer ticks to share | Volunteers | `interests` | That group only | Group can contact them | Until deleted |
| Note to the group | Volunteers | `interests` | That group only | Practical info | Until deleted |
| Attendance tick | Volunteers | `interests.attended` | That group; the volunteer | Future recognition programme | Until deleted (**decide a limit**, section 6) |
| Reminder choices and mobile | Volunteers | `profiles` | The person only (not groups) | Reminders | Until deleted |
| Group contact person (name, email) | Organisers | `organisation_contacts` | That group's members; admins | Admin contact | Until the group closes |
| Role point person and on-the-day contact | People the group names | `opportunity_contacts` | That group; volunteers registered for that role, **only once the group ticks permission** | Questions and meeting on the day | Until the role is deleted |
| Child Safe document | Organisations | Private storage bucket | The uploader; admins | Vetting | Until the group closes |
| Logo, event photos | Organisations | Public storage | Everyone | Display | Until replaced |
| Reminder log | System | `reminder_log` | Nobody through the website | Stop duplicate reminders | **90 days, deleted automatically** |
| Calendar subscription links | Volunteers, organisers | `calendar_feeds` | The owner | Calendar sync | Until reset or the account is deleted |

**Not collected, on purpose:** passwords (sign-in is by emailed link), dates of birth (we ask "18 or over?" only), home addresses, WWCC numbers, health information, payment details.

## 3. What's built in

**Access control**
- Row-level security on every table, so the database itself decides who can read what. There's no service-role (master) key in the app. Jobs without a signed-in user, such as reminders, go through narrow database functions unlocked by a secret.
- **Fixed in this build:** the original starter let anyone read every organisation's contact person and Child Safe file location through the public API. The contact person now lives in a private table, and the public only sees *whether* Child Safe evidence is on file.
- Tested: a signed-out visitor, a signed-in stranger, a registered volunteer, a withdrawn volunteer and the organiser each see only what they should (role contacts, attendance, reminders).
- Groups only ever see a volunteer's display name plus what the volunteer ticked to share.

**Collecting the minimum, and saying why (APP 3 and 5)**
- Short notices at sign-in, on the interest form and at group registration say what we collect and why, linking to the privacy policy.
- Volunteers are asked not to put health or medical details in notes. Organisers are asked to only use photos where everyone has agreed to appear, and no photos of children.
- Third-party contacts (the point person, the on-the-day contact) are shared only after the group confirms it has their permission. Who ticked it, and when, is recorded.

**People's control over their information (APP 11, 12, 13)**
- Volunteers can delete their own account (My volunteering → Your account). Their profile, interests, reminder settings, calendar links and reminder history are removed with it.
- Volunteers can turn reminders off.
- Calendar links can be reset if shared by mistake. Calendar feeds never include anyone's contact details, because feeds get forwarded and copied into Google, Apple and Microsoft.

**Security in transit and on the website**
- HTTPS only (HSTS), no embedding in other sites (stops click-jacking), forms only post back to Good Local Life, and other sites never see page addresses (which may hold a private calendar link).
- Uploads are checked for type and size (images: JPG, PNG or WebP, 5 MB max). SVG is blocked because it can carry scripts.
- Sign-in links expire after 1 hour.

**Where data lives (APP 8, cross-border)**
- Database and file storage: Supabase, Sydney.
- Website server code: Vercel, pinned to Sydney (`vercel.json`).
- Email: depends on the provider chosen at go-live (section 4). This must be named in the privacy policy if it's overseas.

## 4. Cost-efficient choices that also help privacy

| Need | Choice | Cost | Privacy note |
|---|---|---|---|
| Database, sign-in, storage | Supabase, Sydney | Free now; Pro about US$25 a month at launch (free projects pause after 7 days without traffic) | Onshore, encrypted, daily backups on Pro |
| Hosting | Vercel Hobby, functions in Sydney | Free (check the non-commercial terms) | Onshore functions |
| Email (sign-in links and reminders) | **Option A: Amazon SES, Sydney region.** Option B: Resend. | SES: about US$0.10 per 1,000 emails. Resend: free up to 3,000 a month (100 a day), then from US$20 a month. | **SES keeps email onshore** and is cheaper as volume grows, but takes more setup. Resend is easier but US-based, so it must be disclosed as an overseas recipient. The app works with either (both use SMTP). |
| Text messages | **Off** (`NEXT_PUBLIC_SMS_ENABLED`) | A$0 now. About A$0.08–0.10 a text if turned on. | Fewer services holding phone numbers |
| Reminders scheduler | `pg_cron` inside Supabase | Free | Nothing leaves the database except the call to our own site |

## 5. If something goes wrong: breach plan (keep it short)

1. **Contain:** reset keys or passwords, disable the affected feature, reset leaked calendar links.
2. **Assess** (within 30 days, sooner is better): what information, whose, how many people, could it cause serious harm?
3. **Notify** if serious harm is likely: the OAIC (online form) and the people affected, saying what happened and what they should do.
4. **Review:** fix the cause and record what happened.

Keep a simple log of any incident, even ones that turn out not to need notifying.

## 6. To do before launch

**Decisions for Robyn and Mark**
- [ ] GoodLocalLife is a joint, wider offering. Decide which legal entity collects the information (the "APP entity") and how the partners share it. Each partner using volunteers' information for its own purposes would be a disclosure that needs telling people about up front, and usually consent.
- [ ] Before adding business promotion or a loyalty programme: promotional emails need consent and an unsubscribe link (Spam Act), and sharing volunteers' details with venues needs clear consent. Plan this into sign-up rather than adding it later.
- [ ] Which legal entity runs Good Local Life, and does it opt in to the Privacy Act (recommended)?
- [ ] Email provider: Amazon SES Sydney (onshore, cheapest at scale) or Resend (simplest, overseas).
- [ ] How long to keep volunteering history and attendance after a slot (suggestion: 2 years, then remove names), and for groups that close.
- [ ] Who are the admins? Keep it to 1–2 people.

**Paperwork**
- [ ] Privacy policy (the `/privacy` page) covering: what's in section 2, why, who sees it, overseas providers, how to get a copy or correction, how to complain (to us, then the OAIC), and the contact person. Get it reviewed.
- [ ] Volunteer terms and organisation terms, including the organisation's promise that it has permission to share point-person details and photos.
- [ ] A privacy contact email address (replace `hello@example.org` in the footer).

**Accounts (free, high value)**
- [ ] Turn on two-factor sign-in for GitHub, Supabase, Vercel, the email provider and the domain registrar.
- [ ] Keep these accounts in the organisation's name, not a personal one, so they survive a change of volunteers.
- [ ] Store `CRON_SECRET` and API keys only in Vercel or Supabase settings, never in code or chat.

**Code (tracked in docs/ROADMAP.md)**
- [x] Upgraded Next.js 15 → 16, Zod 3 → 4 and @supabase/ssr 0.5 → 0.12 (November 2026). Remaining audit warnings (16, moderate) are all in developer-only lint tools that never reach the live site.
- [ ] Admin screen: show organisation contacts and open Child Safe documents through admin-only database functions (the public can no longer read them).
- [ ] "Download my information" for volunteers (APP 12). Until then, handle requests by email.
- [ ] Automatic clean-up for the history limit you choose above.
