# Pi-Volunteers

Volunteer roles from Phillip Island groups, in one place. Volunteers browse and say they're interested; organisations post roles, confirm volunteers and share to Facebook.

Stack: **Next.js 15 (App Router) · Supabase (Postgres, Auth, Storage) · Tailwind CSS 4 · Vercel**.

## What's in this starter

| Area | Status |
|---|---|
| Home, Find a role, Role detail, Organisations, Org profile | Working, reads live data |
| Sign in: email magic link + mobile SMS code | Working (SMS needs Twilio in production) |
| Register interest (18+ only, choose what to share) | Working |
| My volunteering (upcoming, past, withdraw) | Working |
| Org registration (+ Child Safe PDF upload) | Working, admin approves in Supabase Studio |
| Org dashboard: Live / Draft / Past, confirm or decline | Working |
| Post editor with "Start from last year" clone | Working |
| Facebook share (Open Graph preview on every role page) | Working |
| About, Calendar, emails, admin screen, noticeboard PDF | To do. See `docs/ROADMAP.md` |

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

- Magic-link emails land in the local inbox at http://localhost:54324.
- SMS test login: mobile `0400 000 000`, code `123456`.
- Database admin: http://localhost:54323.

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
3. **Vercel**: import the GitHub repo, add the 3 env vars from `.env.example`, deploy.
4. **Supabase → Auth → URL configuration**: set Site URL to `https://www.pi-volunteers.com` and add `https://www.pi-volunteers.com/auth/callback` to redirect URLs.
5. **Email**: Supabase's built-in email allows only a few messages an hour. Add Resend as custom SMTP (Auth → SMTP settings).
6. **SMS**: Auth → Providers → Phone → Twilio. Needs a Twilio account and an Australian sender.
7. **Domains**: the site is `www.pi-volunteers.com`. `pi-volunteer.com` (singular) catches typos and forwards to it.
   - In Vercel → Project → Domains, add all four: `www.pi-volunteers.com` (primary), `pi-volunteers.com`, `www.pi-volunteer.com` and `pi-volunteer.com`. Set the last three to **Redirect to `www.pi-volunteers.com` (308 permanent)**.
   - At the domain registrar, point each domain's DNS at Vercel as Vercel shows (an A record for the bare domain, a CNAME for `www`).
   - Set `NEXT_PUBLIC_SITE_URL=https://www.pi-volunteers.com` in Vercel.
   - `next.config.ts` also redirects the singular domain, keeping the path, in case the Vercel setting is missed.

## Running costs (estimate, check current pricing)

| Service | Plan | Monthly |
|---|---|---|
| Vercel | Hobby (free) | $0. Hobby is for non-commercial use; a free community noticeboard should qualify, check the terms. |
| Supabase | Free | $0. Free projects pause after 7 days with no traffic. Move to Pro (about US$25) at launch. |
| Resend | Free (3,000 emails) | $0 |
| Twilio SMS | Pay per message | Roughly A$0.08–0.10 per sign-in code |
| Domains (pi-volunteers.com, pi-volunteer.com) | Yearly | About A$3–5 a month for both |

With Supabase Pro this comes to about A$45–50 a month plus SMS. To stay well under A$50, make email the main sign-in and SMS the backup.

## Approving an organisation

Until the admin screen is built: Supabase Studio → `organisations` → set `status` to `approved`. Child Safe PDFs are in Storage → `child-safe`.
