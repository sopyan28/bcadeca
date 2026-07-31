# Handoff: BCA DECA Chapter Hub

## Overview
A chapter website for BCA DECA (Bergen County Academies' DECA chapter) with a public homepage, a members area (announcements, resources, season/conference logistics), a gamified exam-prep arena with a penguin-on-ice leaderboard, a shop, a profile/diagnostic view, and a past-conferences photo gallery.

**This is the core ask for engineering:** turn this static, single-user HTML prototype into a real multi-user product with:
- **Authentication** — members log in (likely restricted to school email domain / Google Workspace SSO).
- **Roles** — co-presidents (or "officers") get an admin capability to post/edit/delete announcements, upload permission-slip/packing-list PDFs, and edit season timeline content. Regular members are read-only on those.
- **Persistence** — a real database so XP/leaderboard/shop/profile state, announcements, and uploaded files persist across sessions and sync across users (today all of this lives in React component state and resets on page reload).
- **File uploads** — PDF embedding/linking for permission slips, packing lists, rooming forms (currently placeholder buttons with no file behind them).
- **Editable content** — presidents should be able to check things off, delete/edit announcements and forms, and manage the blazer/trifold inventory counts, without a developer touching code.

## About the Design Files
The bundled file (`bca-deca-site.dc.html`) is a **design reference built in HTML/React** — it demonstrates the intended look, layout, copy, and interaction/animation behavior. It is not production code to import directly (it uses a proprietary runtime/templating layer — `support.js` — that only exists in the design tool it came from). The task is to **recreate these screens and interactions in your own stack** (suggest: React/Next.js + a hosted DB like Supabase/Firebase for auth+data, given the school-club scale), matching this reference pixel-for-pixel where it says "hifi" below.

Open the file directly in a browser to see it live (it is a self-contained HTML document); view source to read exact copy, colors, and structure. All styling is inline (no external stylesheet) so every visual value is readable directly on the element in question.

## Fidelity
**High-fidelity.** Colors, type, spacing, and copy shown are final — recreate pixel-perfectly. The mascot penguins are drawn from CSS shapes (divs), not images — keep that approach or swap for real illustration/sprite assets, either is fine as long as proportions/colors match.

## Screens / Views

### 1. Home (public, no login required)
- Sticky top header, white bg, bottom border `#dcebf8`, shadow `0 2px 14px rgba(40,120,200,.07)`. Contains: logo mark (38×38 rounded-6px gradient `#34a9ee→#1366b3` square with 🐧 emoji, drop shadow `0 3px 0 #0f5497`), wordmark "BCA DECA" (Sora 800 19px, `#0e3a63`, "DECA" in `#1b8ad6`) + subtitle school name (10px `#7c99b6`), then a 4-item nav (Home / Members / Prep / Past Conferences) as text buttons with a 3px `#1b8ad6` underline indicator on the active tab.
- Full-width banner image slot, 260px tall, directly under header (placeholder — user-supplied chapter photo).
- Hero section: gradient bg (`165deg, #bfe6ff → #e7f5ff → #eaf6ff`), two-column grid (1.15fr/.85fr). Left: pill badge ("🏆 The 2026–2027 Season has started!"), H1 (Sora 800 50px, `#0c3257`), paragraph body copy, two CTA buttons ("Start prepping →" filled blue `#28a3ee` with `0 5px 0 #1366b3` bottom-shadow "pressed" look; "Members area" outlined white). Right: large floating penguin emoji (140px, gentle float animation) with two floating stat-card callouts ("+50 XP ⚡", "🥇 Rank #1").
- Two-column info section below hero: left card "About Us" (white, border `#e3eef8`, radius 10px) with chapter description + 3 stat call-outs (120+ members / 34 ICDC qualifiers / 12 events, each Sora 800 26px `#28a3ee`). Right card "Sponsor us" (navy gradient `160deg,#0e3a63,#1366b3`, white text) with sponsorship pitch copy, advisor mailto link, address, and a "Become a sponsor" gold button (`#ffd23f`).

### 2. Members area (requires login) — continuous scroll page
Two-column layout: sticky left sub-nav (Announcements / Resources / Season 26–27, each a button that smooth-scrolls to its section) + a scrolling content column. **Scroll-spy**: as the user scrolls, the active section is detected (element whose top is within ~110px of viewport top) and highlighted in the sub-nav.

**Announcements section:**
- Pinned card (navy gradient, 🔒 "Members only" badge) titled "Wednesday Club Room Assignments" — 3 equal columns splitting the roster alphabetically evenly (A–I / J–R / S–Z) each mapped to a room number (179/180/181). **This needs to be admin-editable** (officers change room numbers weekly).
- "Fundraising" sub-section: 2-up cards (bakesale, presale) each with an emoji, title, description, and a CTA button. **These need to be creatable/deletable/editable by officers** (new fundraiser posts), not hardcoded.

**Resources section** (currently just "Borrow"):
- Two-column: "Blazer Inventory" (grid of 6 sizes XS–XXL each showing a live count and a disabled "Request" button once count hits 0 — **needs real inventory tracking**), and "Trifold Request" (a small form: event name + date fields + submit button — **needs to actually submit/store a request**).

**Season 26–27 section:**
- Horizontal 5-step timeline (kickoff → weekly prep → Regionals → SCDC → ICDC) with checkmark/current-step styling.
- Two conference cards (SCDC, ICDC) each listing 3 required items — Permission slip / Packing list & rules / Rooming form — each with an "Open" button. **These buttons currently do nothing — they need to link to real uploaded PDFs / embedded Google Forms**, editable by officers.

### 3. Prep (top-level nav item) — the gamified exam-prep arena
Internal tab bar: Arena / Diagnostic / Event Resources / My Profile.

**Arena tab:** two-column — a sticky sidebar (Practice / Missed / Shop tabs) + the leaderboard panel.
- **Leaderboard ("The Leaderboard")**: an ocean scene (sky gradient, sun, water strip at bottom) containing all 20 members as "ice-block podiums" sorted by XP descending, left-to-right (rank 1 = leftmost, tallest ice block). Each podium: rank badge on the ice, medal emoji for top 3, member name + XP above a floating CSS-built penguin character (body/head/wings/feet built from styled divs, colored per-member, with equip slots for the current user: hat/eyes/neck/hand/emote). Ice block height scales with XP (min 26px, max 210px) with a smooth `.5s` height transition. **In the prototype, "bot" members' XP randomly drifts every ~5s to simulate liveness — replace with real XP updates from actual member activity.**
- Reordering uses a FLIP animation: when ranks change, blocks animate `.65s` sideways into their new position rather than snapping.
- **Practice tab (sidebar):** 4 session-type cards, each with a colored type tag (quick=green `#58c47b`, cluster=blue `#28a3ee`, diagnostic=purple `#9b7bf0`, weak spots=red `#ef6f6c`), question count, time estimate, and XP/DECA$ reward. Clicking "cluster" opens a modal to first pick a DECA cluster (Marketing/Finance/Business Management/Entrepreneurship/Hospitality & Tourism) or "🔀 Shuffle", then starts; quick/diagnostic start immediately over the full question bank; "weak spots" is disabled until the user has missed at least one question, then only pulls from areas they've missed.
- **Missed tab:** list of previously-missed questions with the user's wrong answer, correct answer, and explanation.
- **Shop tab:** grid of purchasable items across 3 sections — Outfits (hat/eyes/neck/hand slots), Emotes (penguin dance animations), Power-ups (hint pack, double points, streak freeze) — priced in "DECA$" earned from practice sessions. Owned items show "✓ On"/"▶ Use"; unowned show price.
- **Question modal:** full question flow — progress bar, KPI-area label, 4 answer choices (A–D), hint power-up button (removes 2 wrong choices), instant right/wrong feedback with explanation text, "Next question →" / "Finish session 🎉" CTA. A completion toast shows XP/DECA$ earned.
- **Diagnostic tab:** per-KPI-area accuracy breakdown (strongest 3 / focus-area 3 call-outs, then a full list with progress bars colored green ≥70%, yellow ≥40%, red below).
- **Event Resources tab:** list of competitive events (Principles of Marketing, Finance, ENT, Hospitality & Tourism, Business Mgmt & Admin) each with a cluster tag and a row of resource-link chips. **These links are currently inert placeholders — need real files/URLs.**
- **My Profile tab:** penguin avatar (scaled 1.5x) + rank badge + "Customize in Shop" shortcut, a 6-stat grid (Rank/Level/Total XP/DECA$/Streak/Items), a "Where you lose points" mini-breakdown (worst 4 KPI areas), and a **radar/spider chart** (hand-drawn SVG polygon, blue fill `rgba(40,163,238,.22)` / stroke `#28a3ee`) plotting accuracy % across every KPI area the user has answered questions in (requires ≥3 areas answered to render; otherwise shows a placeholder message).

### 4. Past Conferences (top-level nav item)
A "photo wall" of scattered, individually-rotated polaroid-style cards (each `-3deg` to `+3deg` rotation, varying widths 170–250px) that wrap onto multiple rows as the page scrolls vertically (no horizontal scroll). White border/padding around each placeholder photo with a drop shadow. On hover: the card straightens (`rotate(0)`), scales up slightly (`1.06`), and a caption (event name + location, white text over a navy `rgba(14,58,99,.62)` scrim) fades in directly over the photo.

## Interactions & Behavior
- Header nav underline indicator (3px bar) animates under the active top-level tab.
- Members sub-nav uses scroll-spy (see above) — clicking a sub-nav item also does a smooth `scrollIntoView`.
- Leaderboard podiums reorder with position-swap animation (FLIP technique) whenever XP changes.
- All buttons use a "pressed button" style: solid background + an offset bottom box-shadow in a darker shade, giving a subtle 3D/tactile look (e.g. `box-shadow:0 5px 0 #1366b3` under `background:#28a3ee`).
- Toasts: bottom-right, slide/fade in (`.3s`), auto-dismiss after 3s, used for "session complete", "purchased item", "not enough DECA$" feedback.
- Modals (question flow, cluster picker) are centered overlays with a blurred navy scrim (`rgba(14,58,99,.55)`, `backdrop-filter:blur(4px)`), white rounded panel, pop-in animation.
- Gallery caption reveal and podium-scale-on-hover use simple opacity/transform transitions (`.18s`–`.2s` ease).

## State Management
This prototype keeps everything in a single component's local state (no backend). For the real build, model at least:
- **User/session**: authenticated member identity, role (member vs. officer/co-president).
- **Member roster**: id, name, XP, avatar/equipped-cosmetics, DECA$ balance, streak, level — persisted per user, updated by real question-answering activity (not the simulated random "bot drift" in the prototype).
- **Question bank**: question text, 4 choices, correct index, explanation, KPI "area", DECA cluster — ideally admin-editable/importable, not hardcoded.
- **Session/attempt log**: per-user history of answered questions (correct/incorrect, area) — feeds the diagnostic radar chart, the "missed questions" list, and the "weak spots" practice mode.
- **Shop inventory & purchases**: item catalog (cosmetics, power-ups) + per-user owned/equipped items and consumable power-up counts.
- **Announcements**: CRUD list, each with title/body/date, optionally a "pinned" flag for the room-assignments card; posting restricted to officer role.
- **Resources/forms**: uploaded file references (permission slips, packing lists, rooming forms) per conference; blazer inventory counts (editable); trifold request submissions (a simple list officers can view/manage).
- **Gallery**: uploaded photo references with a caption per photo, organized by conference/event.

## Design Tokens
**Colors**
- Background base: `#eaf6ff`
- Primary blue: `#28a3ee` (buttons/accents), pressed-shadow `#1366b3`
- Deep navy (headings/text): `#0e3a63`, `#0c3257`
- Secondary text: `#5d7894`, `#7c99b6`, `#9bb4cc`
- Borders: `#e3eef8`, `#dcebf8`, `#eef5fb`
- Success green: `#58c47b` / `#3ab068` (shadow)
- Warning/gold: `#ffd23f`, `#ffce3a`, `#b07d05` text, `#fff8e6` bg
- Error/red: `#ef6f6c`, `#d9534f`
- Purple (diagnostic accent): `#9b7bf0`
- "You" highlight (gold): `#ffd23f` fill, `#f0bd2e` border

**Typography**
- Headings: Sora, weights 500–800
- Body/UI: Nunito, weights 400–900
- Scale in use: 50px (H1) / 24–25px (section H2) / 17–21px (card titles) / 12.5–14.5px (body) / 9.5–12px (labels/tags)

**Radius**: small controls/tags 3–6px; cards 7–10px; pill buttons/badges 10–20px (fully rounded)

**Shadows**: "pressed button" pattern `0 Npx 0 <darker-shade>` (N = 3–5px depending on button size); card/modal shadows use soft blurred rgba navy, e.g. `0 12px 34px rgba(20,80,150,.22)`, `0 30px 70px rgba(10,40,80,.35)` for modals.

## Assets
- Chapter banner photo and hero photo: user-supplied, currently drag-and-drop placeholder slots (built with a small custom `<image-slot>` web component — any file-upload/image-picker component works as a replacement).
- Past-conference gallery photos: all placeholders (dashed-border diagonal-hatch pattern) — need real photos per event.
- Penguin mascot: built entirely from styled `<div>`s (no image asset) — body, head, wings, feet, and equip-slot cosmetics (hat/eyes/neck/hand) layered via absolute positioning. Reference the `penguin(m)` method in the JS for exact part sizes/colors/positions if recreating with the same technique; otherwise substitute an illustrated sprite sheet matching the same silhouette and color slots.
- No custom icon assets — all icons are emoji.

## Files
- `bca-deca-site.dc.html` — the full design reference (all screens, styles, and interaction logic in one file; view source for exact markup/colors, or open in a browser to interact with it directly).
