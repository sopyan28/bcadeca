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

That single file contains all 8 migrations plus the seed data (question bank, shop
catalog, blazer inventory, starter announcements), in the correct order.

**Verify it worked** — run this afterward in the same editor:

```sql
select
  (select count(*) from public.questions)   as questions,
  (select count(*) from public.shop_items)  as shop_items,
  (select count(*) from public.announcements) as announcements;
```

Expect roughly: 18 questions, 16 shop items, 3 announcements.

## Step 2 — Turn on email confirmations

Dashboard → **Authentication → Providers → Email**. Make sure "Confirm email" is on.
Supabase's free tier sends a limited number of emails per hour; that is fine for a
club of ~120 but not for a mass signup in one sitting.

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

1. Push this folder to a GitHub repo (`.gitignore` already excludes `.env.local`).
2. Import the repo at https://vercel.com/new
3. In Vercel → Settings → Environment Variables, add the same four variables from
   `.env.local`, but set `NEXT_PUBLIC_SITE_URL` to your real Vercel URL.
4. Back in Supabase → **Authentication → URL Configuration**, add that same URL to
   **Site URL** and **Redirect URLs**, or email confirmation links will 404.

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
