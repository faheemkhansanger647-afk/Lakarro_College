# Update Notes — Golden & Green Edition (October 2026)

## What changed (quick summary)

1. **New theme — Emerald & Gold.** The whole site now uses a light, modern
   golden + greenish look with soft gradients (never heavy solid colors):
   ivory background, deep emerald primary, rich gold accents, jade details,
   gradient heroes, and a new `.text-gradient-brand` gold→green text effect.
   Dark mode and Lantern mode were re-tinted to match.

2. **Footer is now HOME-ONLY.** The big footer (brand, quick links, programs,
   contact) appears only on the Home page. Every other page/tab — About,
   Contact, Programs, Gallery, Results, admin dashboard, everything — ends
   cleanly without it.

3. **Duplicate "Estd." removed + EMIS code from settings.** The footer used to
   hardcode "Estd. 2004" while the home hero also shows "Est. 2004". The footer
   line now shows your **EMIS code** pulled live from Admin → College Settings
   (`Affiliated with Bacha Khan University, Charsadda · EMIS: <your code>`).
   Change the EMIS code any time in the admin panel — the footer updates itself.

4. **Gallery — much more admin control** (Admin → Content → Gallery):
   - **Edit albums**: rename, rewrite description, replace or remove the cover.
   - **Edit any photo/video caption** (pencil icon on hover).
   - **Set any photo as the album cover** (image-plus icon on hover).
   - **Bulk select + bulk delete** (checkbox on each item, "Select all").
   - Everything from before still works: multi-upload, Facebook/YouTube embeds.

5. **Contact page — fully admin-managed** (Admin → College Settings →
   **Contact Information**):
   - Office hours (no longer hardcoded)
   - Secondary phone number
   - WhatsApp number (turns into a clickable wa.me link)
   - Facebook page URL
   - A highlighted "note" banner on the Contact page
   Leave any field empty and it disappears from the public page automatically.

6. **Programs — redesigned UI + full admin control** (Admin → College →
   Manage Programs):
   - Fresh golden/green UI: gradient intro card, category sections
     (emerald / gold / jade), subject-count badges, hover lift cards.
   - Every program page now has an **Admission Contact** card that pulls the
     phone, email, WhatsApp and office hours you set in College Settings.
   - The admin panel can now **edit every program** — title, short name,
     category, duration, tagline, description, admission requirement, career
     pathways, per-program contact note, and **subject groups** (1st/2nd Year
     or Semesters with unlimited subjects).
   - Editing a built-in program (same slug) overrides it; untick "Active" to
     hide a built-in program from the public page.
   - New programs added in the admin panel appear on the public site instantly.

## ⚠ ONE-TIME STEP — run the database upgrade

For features 5 & 6 to save to your database, run the included SQL file once:

1. Open https://supabase.com/dashboard → your project.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open `supabase-migration.sql` (in this project root), copy ALL of it, paste,
   press **Run**.
4. Done — you'll see "Success. No rows returned". The file is safe to re-run.

> Until you run it, everything else (theme, footer, gallery edits, captions,
> bulk delete) works immediately. The new contact fields and programs save
> locally and show a friendly hint about running the migration.

## Files added
- `supabase-migration.sql` — the one-time database upgrade
- `UPDATE-NOTES.md` — this file

## Files changed (same locations as before)
- `index.html` — theme-color metas
- `tailwind.config.ts` — new `bronze` (deep gold) color token
- `src/index.css` — full Emerald & Gold re-theme (light/dark/lantern)
- `src/components/layout/PageLayout.tsx` — footer renders only on Home
- `src/components/layout/Footer.tsx` — green/gold theme, EMIS from settings,
  social links from settings
- `src/hooks/useSchoolSettings.ts` — new optional contact fields, schema-proof
- `src/hooks/usePrograms.ts` — **new** programs data hook (Supabase + merge)
- `src/pages/Home.tsx` — hero gradient → ivory/sage/emerald, gold award tile
- `src/pages/Contact.tsx` — admin-managed contact cards + note banner
- `src/pages/Programs.tsx` — redesigned UI + admin-managed data + contact card
- `src/pages/About.tsx` — fixed broken "With an of…" EMIS sentence
- `src/pages/admin/tabs/AdminGallery.tsx` — album editing, caption editing,
  set-cover, bulk select/delete
- `src/pages/admin/tabs/AdminPrograms.tsx` — database-backed programs manager
  with subject-group editor
- `src/pages/admin/tabs/AdminSchoolSettings.tsx` — Contact Information card,
  EMIS label fixed, safe saving
- `src/pages/admin/tabs/AdminOverview.tsx` — removed duplicate "Est." line
- `scripts/prerender-lib.mjs` — footer wait only on the home route

## ─── Round 2 — Build fixes, Premium Admin, Privacy & SEO hardening ───

### 1. Vercel build errors FIXED (npm run build now passes)
- `src/components/layout/Navbar.tsx` — removed the leftover Git merge-conflict
  markers (`<<<<<<< HEAD` / `=======` / `>>>>>>>`) and kept the correct JSX.
- `src/pages/admin/tabs/AdminExamSeating.tsx` — `CLASS_COLORS` no longer has
  duplicate `"1st Year"` / `"2nd Year"` keys (converted to an indexed palette
  with a safe fallback), so the duplicate-key build error is gone.
- Tailwind `duration-[800ms]` ambiguous arbitrary value replaced with a
  standard duration class — the build warning is gone.

### 2. Navbar — professional on laptop AND mobile
- Desktop: tidy centred sections with soft-tinted icon panels, active pill,
  keyboard search (⌘K), theme switchers and Sign In aligned in one clean row.
- Mobile: compact bar (logo + menu), elegant full-screen drawer with accordion
  groups (icon + title + description), theme row and Sign In — nothing
  overlaps or distracts on small screens.
- Live countdown chips (Roll No. Slip / Results) sized and aligned properly
  on both viewports.

### 3. Modern Green + Golden theme — dark & light
- Whole site runs on the Emerald & Gold system: ivory light theme, deep
  green-gold dark theme (plus the Lantern reading mode). Heavy solid colour
  blocks were replaced with light gradient washes so the site stays fast and
  premium on every page, in both themes.

### 4. Admin panel — premium look
- Sidebar rebuilt: brand header with emerald→gold gradient wash, gold-ringed
  logo, gradient "Admin Panel" wordmark, gold gradient Administrator badge
  and gradient avatar.
- Every nav item now has a proper Lucide icon in a soft tinted chip (no more
  bare emojis), and the active item is an emerald gradient pill with a gold
  indicator bar.
- Topbar got a subtle gold underline accent; the mobile bottom bar shows a
  green-gold indicator on the active tab.

### 5. Hardcoded data REMOVED (admin/settings-controlled)
- The principal's name and the phone number are no longer frozen anywhere in
  code or static SEO files. They now come only from:
  - **Admin → College Settings** (school_settings) for every dynamic page,
  - optional `SCHOOL_PRINCIPAL` / `SCHOOL_PHONE` env vars for the AI/SEO
    serverless feeds when the database cannot be reached.
- Cleaned in: index.html (JSON-LD + noscript), faqData, SEO page content,
  humans.txt, /api/ai-data + /api/render feeds, SiteSchema, admin form
  placeholders. If a value is empty it is omitted — never a stale name.
- `foundingDate` corrected to **2004** everywhere (the official establishment
  year of GDC Lakarai).
- No old-school name references remain — printed/PDF documents read the
  college identity (Government Degree College Lakarai) from admin settings
  via `src/lib/schoolIdentity.ts`.

### 6. SEO & performance verified
- robots.txt (search + AI crawlers), sitemap.xml, canonical tags, robots meta,
  OpenGraph/Twitter cards, JSON-LD graph (static + live), llms.txt, AI JSON
  feed, RSS, PWA manifest + service worker — all present and consistent.
- Heavy libraries (Excel, PDF, charts, maps) are lazy-loaded per route only
  when used; fonts are non-render-blocking; 26/26 pages prerendered for
  instant first paint. No features were removed.
