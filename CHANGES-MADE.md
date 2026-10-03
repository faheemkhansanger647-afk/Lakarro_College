# CHANGES MADE — GDC Lakarai Website Update

This file documents every change made in this update, with exact file locations.

---

## 1. Admin Panel → Manage Students Tab

**Exam options changed to: Mid Term · Annual · Board Exam**

| File | Change |
|------|--------|
| `src/pages/admin/tabs/AdminStudents.tsx` | Exam dropdown for promotion now uses `ALL_EXAM_TYPES` = `["Mid Term", "Annual", "Board Exam"]`. Removed `["1st Semester", "2nd Semester", "Annual-I", "Annual-II"]`. Default promotion exam set to `"Annual"`. Classes remain **1st Year / 2nd Year** (shown at the top). |

## 2. Exam Type changed EVERYWHERE (Mid Term · Annual · Board Exam)

| File | Change |
|------|--------|
| `src/utils/examTypeLabel.ts` | New single source of truth: `ALL_EXAM_TYPES = ["Mid Term", "Annual", "Board Exam"]`. Legacy values still display correctly if they exist in the database. |
| `src/pages/admin/tabs/AdminResults.tsx` | `getExamTypes()` now returns Mid Term / Annual / Board Exam for every class; result-entry exam tabs use it automatically. |
| `src/pages/admin/tabs/AdminDMCs.tsx` | Term selector rebuilt: three buttons (Mid Term / Annual / Board Exam). DMC numbering codes added: `MT`, `AN`, `BE`. Legacy codes kept for old DMC numbers. |
| `src/pages/admin/tabs/AdminExamSchedule.tsx` | Date-sheet exam types + all defaults changed to `"Mid Term"`. |
| `src/pages/admin/tabs/ExamScheduleTab.tsx` | Student-facing date sheet exam tabs updated; default class is now `1st Year`. |
| `src/pages/admin/tabs/AdminExamRollNumbers.tsx` | `TERMS` list, session form default, and default classes (`1st Year`, `2nd Year`) updated. |
| `src/pages/admin/tabs/AdminExamConsole.tsx` | Term matching updated for the new vocabulary (legacy terms still match as fallback). |
| `src/pages/admin/tabs/AdminExamSeating.tsx` | Same matching updates. |
| `src/hooks/useExamAttendance.ts`, `src/hooks/useExamSeating.ts` | Shared matching logic updated. |

> Note: the **Report Card** and **BISE Merit** tabs still show "Annual-I / Annual-II" —
> those are the official **BISE Peshawar board session names** used by the board's
> result API and must stay as-is for board results to load.

## 3. GHS Babi Khel → GDC Lakarai (all references removed)

| File | Change |
|------|--------|
| `api/calendar.js` | Calendar file name `ghs-babi-khel.ics` → `gdc-lakarai.ics` |
| `api/phet.js` | User-Agent `GHSBabiKhel/1.0` → `GDCLakarai/1.0` |
| `README.md` | Repo clone name `ghs-babi-khel` → `gdc-lakarai` |
| `src/lib/schoolIdentity.ts` | Header comment cleaned; identity = Government Degree College Lakarai |
| `UPDATE-NOTES.md` | Old-school name mention removed |

## 4. Established Year: 2018 → 2004 (official ESTB of Lakarai)

| File | Change |
|------|--------|
| `src/components/shared/EditorialNewsCard.tsx` | `EST. 2018` → `EST. 2004` |
| `src/components/shared/EditorialNoticeCard.tsx` | `EST. 2018` → `EST. 2004` |
| `src/pages/NewsDetail.tsx` | `EST. 2018` → `EST. 2004` |
| `src/pages/NoticeDetail.tsx` | `EST. 2018` → `EST. 2004` |
| `src/pages/MeritList.tsx` | `Est. 2018` → `Est. 2004` |
| `src/pages/admin/tabs/AdminStudentIDCards.tsx` | ID-card footer `Est. 2018` → `Est. 2004` (both places) |
| `src/pages/admin/tabs/AdminOverview.tsx` | Est. Year fallback `2018` → `2004` |
| `src/components/seo/ResultsSeoContent.tsx` | "founded 2018" → "founded 2004" |
| `README.md` | Established table row → 2004 |

(The database default in `src/hooks/useSchoolSettings.ts` and `src/lib/schoolIdentity.ts`
already reads **2004**.)

## 5. Cloudinary — keys added & uploads fixed

**Your keys are configured in `.env` (and documented in `env.example`):**

```
CLOUDINARY_CLOUD_NAME=htngwfam
CLOUDINARY_API_KEY=996298763515514
CLOUDINARY_API_SECRET=g1EjlxwXHOpVftw7psxY7uUV4G4
VITE_CLOUDINARY_CLOUD_NAME=htngwfam
```

**Why this works better:** the site previously needed an "unsigned upload preset"
created in the Cloudinary dashboard. You provided only cloud name + API key +
secret, so a new secure signed-upload flow was added:

| File | Change |
|------|--------|
| `api/cloudinary-sign.js` | **NEW** Vercel serverless function. Signs uploads server-side using your API key + secret. The secret NEVER reaches the browser. Origin-restricted + rate-limited. |
| `src/lib/cloudinary.ts` | Now uploads with a server signature (`/api/cloudinary-sign`). Falls back to the old unsigned-preset flow only if `VITE_CLOUDINARY_UPLOAD_PRESET` is set. Uploads also use `/auto/upload` so videos and PDFs work too. |
| `.env` | **NEW** — your real keys for local development (git-ignored). |
| `env.example` | Updated documentation for both modes. |

**On Vercel:** you already added the three `CLOUDINARY_*` variables — nothing
more needed. Just redeploy. All admin image uploads (student photos, gallery,
branding, library) will store into your Cloudinary account `htngwfam` in
folders like `students/`, `gallery/`, `branding/`.

## 6. Bonus: legacy data migration

| File | Change |
|------|--------|
| `supabase-migration-exam-types.sql` | **NEW** — run once in Supabase SQL Editor. Renames any old `1st Semester / 2nd Semester / Annual-I / Annual-II` rows in `results`, `exam_schedule`, `exam_roll_sessions`, `merit_lists` to the new scheme, and enforces school name + `established_year = 2004`. Safe to re-run. |

## 7. Content updates (FAQ / AI assistant / SEO)

| File | Change |
|------|--------|
| `src/data/faqData.mjs` | Exam-scheme answers rewritten (Mid Term / Annual / Board Exam). |
| `api/ai-chat.ts` | AI assistant facts updated. |
| `api/seo.js` | llms.txt feed updated. |
| `scripts/seo-page-content.mjs` | Results & Merit List page SEO copy updated. |

---

## Verified

- `npm run build` passes (26 pages prerendered successfully).
- Cloudinary signature algorithm self-tested (SHA-1, Cloudinary spec).
- No "Babi Khel" or "2018" references remain anywhere in the project.
