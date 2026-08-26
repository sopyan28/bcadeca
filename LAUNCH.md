# Launching the BCA DECA Hub

Status as of the last working session:

- ✅ Dependencies installed, app **builds cleanly** (23 routes)
- ✅ **Zero TypeScript errors**
- ✅ Both algorithms **verified by simulation** (`npm run sim:practice`, `npm run sim:diagnostic`)
- ✅ Supabase project connected, `.env.local` written
- ✅ Auth route-guard verified working (`/prep/arena` → redirects to `/login`)
- ⬜ **Database is still empty — this is the one remaining blocker**

---

## Step 1 — Create the database tables (5 minutes)

Everything else is done. The database has no tables yet, so any page that reads data
will come up empty.

1. Open your project's SQL Editor:
   https://supabase.com/dashboard/project/azwzknnraiopuyqtzsna/sql/new
2. Open `supabase/SETUP_ALL.sql` in this folder, copy the **whole file**.
3. Paste into the SQL Editor and click **Run**.

That single file contains the schema migrations plus the seed data (starter question
bank, shop catalog, blazer inventory, announcements), in the correct order.

**Verify it worked** — run this afterward in the same editor:

```sql
select
  (select count(*) from public.questions)   as questions,
  (select count(*) from public.shop_items)  as shop_items,
  (select count(*) from public.announcements) as announcements;
```

Expect roughly: 18 questions, 16 shop items, 3 announcements.

## Step 1b — Load the district-exam question bank (2 minutes)

`SETUP_ALL.sql` only carries the 18 prototype questions. The real bank — 400 items
parsed from the four 2026 district sample exams — ships as its own file because it is
~390 KB, too big to comfortably paste alongside everything else.

Run these two, in order, as separate queries in the same SQL Editor:

1. `supabase/migrations/0010_question_bank_import.sql` — the 400 questions.
2. `supabase/migrations/0011_diagnostic_fixed_form.sql` — makes the diagnostic a
   fixed-form test (2 questions per instructional area) and adds the per-area
   correct-count the results page reports weak areas from.

Both are re-runnable: 0010 skips any question already in the bank, and 0011 is
idempotent.

**Verify** — expect 418 questions across 25 instructional areas and 4 clusters:

```sql
select count(*) as questions,
       count(distinct kpi_area) as areas,
       count(distinct cluster)  as clusters
from public.questions where active;
```

## Step 2 — Email delivery (the real launch blocker)

Verified against the live project: the email provider is enabled, signups are open,
and **email confirmation is required** (`mailer_autoconfirm = false`). So every signup
waits on a confirmation email before the member can log in.

The catch is *who sends that email*. Supabase's **built-in email service is for
testing only** — it is heavily rate-limited (a couple of messages per hour) and
Supabase explicitly does not support it for production traffic. With ~120 members
signing up around the same meeting, the vast majority of those emails will never
arrive.

**Before inviting members, connect a real SMTP provider.** Dashboard →
**Project Settings → Authentication → SMTP Settings**. Free tiers that comfortably
cover a school club:

| Provider | Free tier |
|---|---|
| [Resend](https://resend.com) | 3,000/month — simplest setup |
| [Brevo](https://brevo.com) | 300/day |
| [Mailgun](https://mailgun.com) | limited trial, then paid |

You will need to verify a sending domain (or use the provider's test domain for
initial testing).

### Testing before SMTP is set up

Two ways to get accounts working without waiting on email:

**Manually confirm a user** — Dashboard → **Authentication → Users** → click the user
→ confirm their email. Good for bootstrapping the first officer.

**Temporarily auto-confirm** — Dashboard → **Authentication → Providers → Email** →
turn *off* "Confirm email". Anyone can then log in immediately without verification.
Fine while testing; turn it back on before real members join, or anyone can register
with an address they don't own.

## Step 3 — Create the first officer account

There are no officers yet, so the `/officer` area is unreachable. To bootstrap:

1. Go to `/signup`
2. Sign up with a school email
3. Enter the invite code: **`BCA-DECA-LAUNCH-2026`**

That code is good for **2 uses** and expires **60 days** after you run Step 1. Once
you're an officer, mint more codes from `/officer/invites` — don't rely on this one.

## Step 4 — Run it locally

```bash
npm run dev
```

Then open http://localhost:3000

## Step 5 — Deploy (when you're ready for members to use it)

### 5a. Push to GitHub

`.gitignore` already excludes `.env.local`, so your keys stay out of the repo.

```bash
gh repo create bca-deca-hub --private --source=. --push
```

(or create an empty repo on github.com, then `git remote add origin <url> && git push -u origin main`)

### 5b. Import to Vercel

Go to https://vercel.com/new and import the repo. Framework auto-detects as Next.js;
leave the build settings alone.

### 5c. Set environment variables in Vercel

Settings → Environment Variables. Add all five from `.env.local`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | same as local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as local |
| `SUPABASE_SERVICE_ROLE_KEY` | same as local (**never** prefix this with `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | `bergen.org` |
| `NEXT_PUBLIC_SITE_URL` | **your Vercel URL** — e.g. `https://bca-deca-hub.vercel.app` |

`NEXT_PUBLIC_SITE_URL` is the one that differs from local. It builds the links in
confirmation and password-reset emails (`app/(auth)/actions.ts`), so if it still says
`localhost:3000` in production, every emailed link will point at the member's own
machine and fail.

Redeploy after adding them — Vercel does not apply env vars to an existing build.

### 5d. Point Supabase at the deployed URL

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

That exact callback path is what the app uses for both email confirmation and
password reset. If it's missing, signup emails land on an error page.

### 5e. Smoke-test production

1. Visit the deployed URL — homepage should load with the live member count
2. Hit `/prep/arena` while logged out — must redirect to `/login`
3. Sign up with a school email, confirm via the emailed link, verify it returns to
   your site (not localhost)

---

## Two things worth deciding

**1. Confirm the email domain.** Signups are currently restricted to `@bergen.org`,
enforced in three places. If that's wrong, change it in **both**:
- `.env.local` → `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`
- and re-run: `alter database postgres set app.allowed_email_domain = 'yourdomain.org';`

**2. The question bank is far too small.** This is the biggest real limitation.

The simulation made it concrete: with the current 18 questions, **48 out of 50**
practice sessions had to relax the "don't repeat a question you just got right"
rule, because 50 sessions need 250 questions drawn from a pool of 18. Members will
see the same questions over and over within days.

With ~20 questions per KPI area (~260 total), the same simulation runs clean: zero
repeats, zero degraded sessions, even distribution across all 13 areas.

Officers can add questions through the app, so this doesn't block launch — but plan
on a question-writing push before members rely on it heavily.

---

## Useful commands

```bash
npm run dev          # run locally
npm run build        # production build
npm run typecheck    # TypeScript check (currently clean)
npm run sim:practice # verify the question-selection algorithm
npm run sim:diagnostic # verify the adaptive diagnostic engine
```
