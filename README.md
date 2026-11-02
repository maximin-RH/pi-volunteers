# Pi-Volunteers

Volunteer roles from Phillip Island groups, in one place. Volunteers browse and say they're interested; organisations post roles, confirm volunteers and share them on Facebook, WhatsApp, email, text, newsletters and their own websites.

Stack: **Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4 · Vercel**.

## What's in this starter

| Area | Status |
|---|---|
| Home, Find a role, Role detail, Organisations, Org profile | Working, reads live data |
| Sign in: email magic link (mobile SMS code built but switched off to save costs) | Working |
| Register interest (18+ only, choose what to share) | Working |
| My volunteering (upcoming, past, withdraw) | Working |
| Org registration (+ Child Safe PDF upload) | Working, admin approves in Supabase Studio |
| Org dashboard: Live / Draft / Past, confirm or decline | Working |
| Post editor with "Start from last year" clone | Working |
| Sharing: copy link, Facebook, WhatsApp, email, text message, newsletter text, website link and button (Open Graph preview on every role page) | Working |
| Calendars: My volunteering and org dashboard month view; add to Apple, Google, Outlook, Microsoft 365; private subscription feeds with reminders | Working |
| Reminders: orgs choose 1 week / 2 days / 1 day / 2 hours before, by email; volunteers can opt out (text reminders built, off until funded) | Working. Needs the scheduler and an email provider in production, see Go live |
| Privacy controls: account deletion, calendar link reset, private org contacts, 90-day reminder log clean-up, security headers | Working. See `docs/PRIVACY-AND-SECURITY.md` for the launch checklist |
| About, public calendar of all roles, confirmation emails, admin screen, noticeboard PDF | To do. See `docs/ROADMAP.md` |

Design reference: `docs/design/Pi-Volunteers Website v3.dc.html`. Open it in a browser to compare.

## 1. Run it locally

You need Node 20+, Docker Desktop (for the local database) and the GitHub CLI.

```bash
npm install
npx supabase start          # local Postgres + Auth + Studio; prints your keys
cp .env.example .env.local  # paste the API URL and anon key it printed
npx supabase db reset       # runs migrations + seed (Island Voice, Carols by the Bay)
npm run dev                 # http://localhost:3000
```

- Magic-link and reminder emails land in the local inbox at http://localhost:54324.
- SMS login is off locally (no SMS provider), so sign in with email.
- Database admin: http://localhost:54323.
- Reminders locally: put any long random string in `CRON_SECRET` in `.env.local`, store the same value with
  `insert into app_secrets (name, value) values ('cron_secret', 'THE-SAME-VALUE');` in Studio's SQL editor, then send due reminders with
  `curl -X POST -H "Authorization: Bearer THE-SAME-VALUE" http://localhost:3000/api/reminders/run`.
  Text reminders are logged as skipped until Twilio is set up.

## 2. Push to GitHub

The repo `maximin-RH/pi-volunteers` already exists and is empty.

```bash
git init -b main
git add .
git commit -m "Pi-Volunteers starter"
git remote add origin https://github.com/maximin-RH/pi-volunteers.git
git push -u origin main
```

## 3. Go live

1. **Supabase**: create a project at supabase.com (region: Sydney). Then:
   ```bash
   npx supabase link --project-ref YOUR-REF
   npx supabase db push
   ```
   Run `supabase/seed.sql` once in the SQL editor.
2. **Make yourself admin**: sign in once on the live site, then in the SQL editor run
   `update profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');`
3. **Vercel**: import the GitHub repo, add the env vars from `.env.example` (Supabase, site URL, `CRON_SECRET`, SMTP, and Twilio if using texts), deploy.
4. **Supabase → Auth → URL configuration**: set Site URL to `https://www.pi-volunteers.com` and add `https://www.pi-volunteers.com/auth/callback` to redirect URLs.
5. **Email**: Supabase's built-in email allows only a few messages an hour. Add your email provider as custom SMTP (Auth → SMTP settings): Amazon SES in Sydney (onshore, about US$0.10 per 1,000) or Resend (free up to 3,000 a month, US-based). See `docs/PRIVACY-AND-SECURITY.md` section 4.
6. **SMS (only once funded)**: Auth → Providers → Phone → Twilio, set the `TWILIO_*` vars and `NEXT_PUBLIC_SMS_ENABLED=true`.
7. **Domains**: the site is `www.pi-volunteers.com`. `pi-volunteer.com` (singular) catches typos and forwards to it.
   - In Vercel → Project → Domains, add all four: `www.pi-volunteers.com` (primary), `pi-volunteers.com`, `www.pi-volunteer.com` and `pi-volunteer.com`. Set the last three to **Redirect to `www.pi-volunteers.com` (308 permanent)**.
   - At the domain registrar, point each domain's DNS at Vercel as Vercel shows (an A record for the bare domain, a CNAME for `www`).
   - Set `NEXT_PUBLIC_SITE_URL=https://www.pi-volunteers.com` in Vercel.
   - `next.config.ts` also redirects the singular domain, keeping the path, in case the Vercel setting is missed.
8. **Reminders**: they're sent by `/api/reminders/run`, which the database calls every 15 minutes.
   - Email: in Vercel set `SMTP_HOST`, `SMTP_PORT=465`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM` from your provider (SES Sydney: `email-smtp.ap-southeast-2.amazonaws.com` with SES SMTP credentials; Resend: `smtp.resend.com`, user `resend`, your API key). Verify the `pi-volunteers.com` domain with the provider first.
   - Texts stay off until funded. When they're on: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` and `NEXT_PUBLIC_SMS_ENABLED=true`.
   - In the Supabase SQL editor, store the secret and start the schedule (use the same value as `CRON_SECRET` in Vercel):
     ```sql
     insert into app_secrets (name, value) values ('cron_secret', 'YOUR-CRON-SECRET');
     select cron.schedule('pi-volunteers-reminders', '*/15 * * * *', $$
       select net.http_post(
         url := 'https://www.pi-volunteers.com/api/reminders/run',
         headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET')
       );
     $$);
     ```
   - Check it's working: `select status, count(*) from reminder_log group by status;`

## Running costs (estimate, check current pricing)

| Service | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (free) | $0. Hobby is for non-commercial use; a free community noticeboard should qualify, check the terms. |
| Supabase | Free | $0. Free projects pause after 7 days with no traffic. Move to Pro (about US$25) at launch. |
| Email | SES Sydney or Resend free tier | About $0 at our volume (SES about US$0.10 per 1,000) |
| Twilio SMS | **Off until funded** | $0 now. If turned on: about A$0.08–0.10 per text; 100 volunteers with 2 text reminders each is about A$16–20 a month. |
| Domains (pi-volunteers.com, pi-volunteer.com) | Yearly | About A$3–5 a month for both |

With Supabase Pro this comes to about A$40–45 a month in total (Supabase Pro plus domains). Everything else stays on free tiers, and text messages are switched off until funded.

## Approving an organisation

Until the admin screen is built: Supabase Studio → `organisations` → set `status` to `approved`. The group's contact person is in `organisation_contacts`. Child Safe PDFs are in Storage → `child-safe`.
